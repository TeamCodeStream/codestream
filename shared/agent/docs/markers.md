# Markers and location calculation

Markers are the tie between posts and source code in CodeStream. They are always stored in CodeStream's
backend even when another messaging backend like Slack is in use. The two collections in MongoDB that
represent existing markers and their locations are respectively `markers` and `markerLocations`.

When the markers for a file are requested, the agent first checks if there is a known location for each
marker at the current commit hash. If there are missing locations, they will be calculated taking into
account the diff of the file between the commit hash when each marker was created and the current commit
hash. The calculated locations are sent to the API Server to be persisted. If there are uncommitted changes,
another calculation is performed for each location, taking into account the diff from the current commit
to the buffer contents.

If a marker is created and refers to a code block that is entirely new (meaning it does not exist in the
committed version of the file), information is stored in the local filesystem under
`.git/codestream-${userId}.cache` to allow
both an accurate display of its location for the author and a correct calculation and broadcast of its
location later when the code is committed.

## Locations and ranges

CodeStream represents the position of a marker using 1-based coordinates, therefore the first valid line/column
is 1,1. These are referred to as **_locations_**. The API server encodes locations as tuples in the
format `[lineStart, colStart, lineEnd, colEnd]`.

LSP in the other hand uses 0-based coordinates, referred to as **_ranges_**. Conversion between locations and
ranges is done in the outermost agent layer, so its internals deal only with locations.

## Database collections and relevant fields

### `markers`

Main collection, where each document represents one marker.

| Field                   | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `postId`                | Id of the post containing the marker                                                              |
| `postStreamId`          | Id of stream representing the channel or DM containing the post                                   |
| `streamId`              | Id of the stream representing the file which the marker refers to                                 |
| `codeBlock`             | Object with information about the code block the marker refers to - see `markers.codeBlock` below |
| `commitHashWhenCreated` | Commit hash of the file at the time of marker creation                                            |
| `type`                  | Marker type                                                                                       |
| `color`                 | Marker color                                                                                      |

**_Other fields_**: `_id`, `deactivated`, `createdAt`, `modifiedAt`,
`teamId`, `numComments`, `creatorId`

#### `markers.codeBlock`

Structure present on each marker, with information about the code block to which the it refers.

| Field  | Description                                               |
| ------ | --------------------------------------------------------- |
| `code` | Contents of the code block at the time of marker creation |

**_Other fields_**: `file`, `location`, `commitHash`, `repoId`, `repo`, `streamId`

### `markerLocations`

Collection with known locations for markers. Each document represents a file (stream) at a certain commit hash
and contains, for that file/commit, a map associating markers to their respective locations.

Note that locations may be missing for some markers, as these are calculated on demand. The fact that the
location for a marker is missing in a document in the `markerLocations` collection simply means that no client
had to calculate it yet.

| Field       | Description                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `_id`       | Concatenation of streamId (file) and commit hash, separated by the pipe (&#124;) character        |
| `locations` | Map associating markerId to location array in the format `[lineStart, colStart, lineEnd, colEnd]` |

**_Other fields_**: `teamId`

## Retrieving markers

- LSP method: `codestream/textDocument/markers`
- Handler: [`MarkerHandler.documentMarkers()`](src/marker/markerHandler.ts)

The handler retrieves all markers for the specified document via
[`MarkersManager.getByStreamId()`](src/managers/markersManager.ts) and their locations via
[`MarkerLocationManager.getCurrentLocations()`](src/managers/markerLocationManager.ts). Some markers
may not have a known location for the current state of the document. Two common reasons why this can happen
are:

- The user does not have in their repository the commit in which the marker was created. This can be the case
  either with shallow copies and truncated histories or with new commits that were not propagated yet from
  the repository where they were created to the user's local repository.

- The code block to which the marker refers to no longer exists in the document.

If the location cannot be determined for a marker, the reason (if known) is specified as
a [`MissingMarkerReason`](shared/util/src/protocol/agent.protocol.markers.ts).

[`MarkerLocationManager.getCurrentLocations()`](src/managers/markerLocationManager.ts) is the method responsible
for orchestrating the marker location calculation process. The steps of this process are:

- Obtain pre-calculated marker locations for the document (file) at its current commit hash
- Group the markers for which there were no pre-calculated locations by `commitHashWhenCreated`
- For each `commitHashWhenCreated`, obtain the diff between that commit and the file's current commit
- Calculate the locations for the current commit based on the diff and the locations at `commitHashWhenCreated`
- Save the calculated locations back to the API server
- Calculate the locations for the current document contents (the contents of the editor), based on the diff between
  the file's current commit contents and the editor contents (these are **not** saved back to the API server)
- Merge uncommitted locations on top of the calculated locations (see [uncommitted locations](#uncommitted-locations))

## Creating markers

- LSP method: `codestream/posts/createWithCode`
- Handler: [`PostHandler.documentPost()`](src/post/postHandler.ts)

When a post with a code block is created, the location of this code block must be determined at the committed version
of the file must be calculated, as it may be different from what's currently in the user's editor. The process of
calculating this location is referred to as **_backtracking_** and is implemented by
[`MarkerLocationManager.backtrackLocation()`](src/managers/markerLocationManager.ts).

If the backtracking process detects that the code block did not exist at the committed version of the file, then we
pinpoint the location where this code block is being inserted relative to the committed version and save its location
as a 0-length marker. Later, when the user commits the file, location is calculated again based on the new commit
and, if the code block was included in the commit, the location is saved to the API server and the marker is updated
to set its `commitHashWhenCreated` property to the current commit. See [uncommitted locations](#uncommitted-locations).

## Uncommitted locations

When a marker is created, the location of the code block selected by the user is backtracked to the contents of the
file at its current commit. In case it is detected that this code block does not exist in the committed version of
the file, or the file itself is new this is considered an **_uncommitted location_**. Note that this only happens
if the code block is entirely new, so it is not a code block that was modified and/or moved.

### Saving uncommitted locations

Uncommitted locations are saved to the [local persistent cache](src/cache.ts) of the respective git repository. Those
caches are persisted as JSON files written to `.git/codestream-${userId}.cache`. An uncommitted location is an entry
in the `uncommittedLocations` property and has the following structure:

```
<markerId>: {
    fileContents: <sring - contents of the file at marker creation time>,
    location: {
        lineStart: <number>,
        colStart: <number>,
        lineEnd: <number>,
        colEnd: <number>,
    }
}
```

### Updating uncommitted locations

Every time a change in the current commit hash is detected, an attempt to flush all uncommitted locations is triggered.
This is implemented by [``MarkerLocationManager.flushUncommittedLocations()`](src/managers/markerLocationManager.ts).

For each uncommitted location in the local persistent cache, the diff between the cached contents and the current
commit contents of the respective file is obtained and the location is calculated. If the location exits, then it is
saved to the API server, the marker is updated to reflect the current commit as its `commitHashWhenCreated` and the
uncommitted location is removed from the local persistent cache.

## Calculating locations

The entry point for marker location calculation is [`calculateLocations()`](src/markerLocation/calculator.ts). A
calculation takes locations and a diff as input and outputs calculated locations. It takes into account the starting
and ending lines of each location (called lines of interest) and recalculates its values based on the offsets provided
by the diff.

The hunks are converted to **_Changesets_**, where each **_Change_** is a pair of connected additions and deletions with
their respective offsets. They are different from hunks because these can contain multiple changes interleaved with
synchronizations.

When a line is directly affected by a Change in the Changeset (which means its contents effectively changed), we try to
find its most similar counterpart in the inserted block, up to a certain similarity threshold. Similarity is defined as
a function of the Levenshtein Distance between two strings, where 0 means the strings are completely different and 1
means they are identical. If we find matches within the threshold, the best match will be considered as the new line
number. Otherwise, the line will be considered missing.

If a location has missing lines (either starting or ending), it will be shrank to the preserved portion of the code
block. If there is no preserved portion (i.e. starting and ending lines are missing and were affected by the same
Change), the whole location is considered missing and we attempt to find it looking at the other Changes in the
Changeset.

### Missing locations

To look for missing locations, we compute the similarity of the deletion in the Change and the addition in other
Changes. The Changes with similarity above the threshold are ranked and the most similar Change is selected. Within
this change, we look look for the matching lines also based on similarity. If we find lines similar enough, these
will be considered the new starting and ending lines of the location.

### Columns

When a line is affected by a Change, its corresponding column must be recalculated as the contents changed. For an
in-depth explanation of this process, refer to the documentation of the
[`calculateColumn`](src/markerLocation/calculator.ts) function.

### Testing

See [Testing of marker locations](https://docs.google.com/document/d/1BiFO-5YxzfCodais2xc315UE8ort-FyRxSyqUG_1rDE) on
Google Docs.
