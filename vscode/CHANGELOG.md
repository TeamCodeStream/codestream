# Change Log

## [11.0.10] - 2021-6-4

### Changed

- Updated terms-of-service acceptance flow

## [11.0.9] - 2021-6-3

### Changed

- You can now reply to any top-level comment in a merge request, regardless of whether or not it was started as a thread
- Form that automatically pops up to request feedback when you commit is now dismissed after 15 minutes of inactivity
- Changing branches while you have the feedback request form open no longer updates the form

### Fixed

- Addresses [#595](https://github.com/TeamCodeStream/CodeStream/issues/595) &mdash; Connectivity Issues Makes CodeStream Unusable
- Addresses [#590](https://github.com/TeamCodeStream/CodeStream/issues/590) &mdash; Commit selection is reset for a Gitlab MR after posting a comment
- Addresses [#522](https://github.com/TeamCodeStream/CodeStream/issues/522) &mdash; Support multi-line comments in GL MR
- Addresses [#400](https://github.com/TeamCodeStream/CodeStream/issues/400) &mdash; Agent is detected as a new process by Intego NetBarrier every time IntelliJ starts
- Fixes an issue with quote replies in a merge request where the reply text would get included in the quote
- Fixes an issue where resolving a codemark or feedback request marks it as unread in the Codemarks/Feedback Requests section of the CodeStream pane
- Fixes an issue with the Commits tab in a pull/merge request showing commits in the wrong order

## [11.0.8] - 2021-5-21

### Changed

- Updated the UI for custom filters in the Issues section to be consistent with custom queries in the PRs section

### Fixed

- Addresses [#547](https://github.com/TeamCodeStream/CodeStream/issues/547) &mdash; Reviewing Gitlab MR with a partial commit range shows invalid changesets
- Addresses [#541](https://github.com/TeamCodeStream/CodeStream/issues/541) &mdash; Suppress html comments in rendering of issues
- Addresses [#537](https://github.com/TeamCodeStream/CodeStream/issues/537) &mdash; Branch selection in dropdown of Codemarks section should automatically pick up branch change
- Addresses [#522](https://github.com/TeamCodeStream/CodeStream/issues/522) &mdash; Support multi-line comments in GL MR

## [11.0.7] - 2021-5-13

### Added

- The Pull/Merge Requests section of the CodeStream pane now refreshes every 5 minutes to pick up changes

### Changed

- Addresses [#506](https://github.com/TeamCodeStream/CodeStream/issues/506) &mdash; Don't reset scroll position when switching tabs in a PR
- Custom queries for either GitHub PRs or GitHub issues now requires [at least one qualifier](https://docs.codestream.com/userguide/faq/custom-queries/) that will prevent the query from return results across all of GitHub
- The banner indicating connectivity issues has been replaced with the blanket that covers the entire CodeStream pane

### Fixed

- Addresses [#546](https://github.com/TeamCodeStream/CodeStream/issues/546) &mdash; Cannot open GitHub Enterprise 2.22 PRs
- Addresses [#565](https://github.com/TeamCodeStream/CodeStream/issues/565) &mdash; Toast notifications (and log) replace "this" with feedback request name
- Fixes an issue where an @mention in a codemark shared to Slack would register twice in the count in the badge on the Activty Feed
- Fixes an issue where adding an emoji to a merge request comment would sometimes add it at the start of the comment regardless of the cursor position

## [11.0.6] - 2021-5-7

### Added

- Provide feedback in the UI for on-prem customers when the api server can't communicate with the broadcaster

### Changed

- Repo/branch names at the top of GitHub pull requests are now links to the appropriate branch on GitHub

### Fixed

- Fixes an issue where an apostrophe would get added to the end of email addresses suggested as reviewers in feedback requests
- Fixes an issue with the display of images in comments on a GitLab merge request
- Fixes an issue preventing you from being able to paste when editing most content types on CodeStream
- Fixes an issue where editing an MR comment and adding a code fence results in divs being displayed
- Fixes an issue where the code block doesn't immediately show in the merge request timeline after adding a new comment
- Fixes an issue where you couldn't edit a merge request comment from Diff Hunks view
- Fixes an issue with the responsiveness of the display of the Merge and Pipeline boxes in a merge request

## [11.0.5] - 2021-4-29

### Added

- Adds the ability to toggle the display of pull request descriptions in the Pull Requests section

### Changed

- Establish GitLab v12.10 as the minimum required version for merge-request support

### Fixed

- Addresses [#502](https://github.com/TeamCodeStream/CodeStream/issues/502) &mdash; Can't checkout to the branch in a merge request
- Fixes an issue where clicking on Diff Hunks view in a pull request would result in an error
- Addresses [#454](https://github.com/TeamCodeStream/CodeStream/issues/454) &mdash; Default headshot display to initials when gravatar/headshot can't be loaded for on-prem users
- Addresses [#498](https://github.com/TeamCodeStream/CodeStream/issues/498) &mdash; GitLab MR doesn't show commits created after MR is added
- Fixes an error when creating a codemark
- Fixes an issue where trying to view a pull request via list/tree view results in an error
- Addresses [#429](https://github.com/TeamCodeStream/CodeStream/issues/429) &mdash; Incorrect user/repo listed at bottom of a PR
- Fixes an issue where hitting Esc to close the comment form in a pull request exits you out of the pull request completely
- Fixes an issue where some loading/saving messages in pull requests don't go away after completion 
- Fixes an issue where merge requests created with unpushed branches lead to GraphQL error
- Fixes an issue with the display of images in merge request descriptions
- Fixes an issue replying to an existing comment in a merge request while there is a pending review
- Fixes an issue deleting a pending review comment in a merge request
- Fixes an issue with broken headshot display when adding a comment in a merge request
- Fixes an issue where the "requested a review" banner in a pull request doesn't go away on submission of a review
- Fixes an issue where WSL users can't select repo when creating a feedback reqest

## [11.0.4] - 2021-4-22

### Added

- Adds the ability to edit a pending review comment in a GitLab merge request
- Adds a roadblock to indicate that merge request support for GitLab Self Managed requires version 12.10.X or later

### Changed

- Ask user if they want to switch teams when clicking on a permalink for an item owned by a team other than the one you currently have selected
- More efficient use of GitHub api points to prevent users from getting hit with rate-limit errors
- Decrease the number of git operations being performed at extension startup
- When going a quote reply in a pull/merge request, a blank line is automatically inserted before the cursor to prevent entered text from being included in the quote

### Fixed

- Addresses [#514](https://github.com/TeamCodeStream/CodeStream/issues/514) &mdash; Merge request not listed when using proxy
- Addresses [#477](https://github.com/TeamCodeStream/CodeStream/issues/477) &mdash; Add messaging when not all files in a large MR will be listed
- Fixes an issue where the issue you select via Start Work in one team, also appears in the Work In Progress section for all of your teams
- Fixes an error when creating a pull request
- Fixes an issue with the Open File buttons in the Changed Files section of a feedback request not working
- Fixes an issue with creating a pull request on Bitbucket
- Fixes an issue where collapsing/expanding sections in the Pull Requests section would cause all queries to refresh
- Fixes an issue where clicking on a mention in a merge request opens a blank page
- Fixes an issue where a local-changes warning would be shown when creating a pull request when there's weren't any local changes in the selected repository

## [11.0.3] - 2021-4-12

### Fixed

- Addresses [#486](https://github.com/TeamCodeStream/CodeStream/issues/486) &mdash; Unexpected error clicking on a merge request after update to 11.0

## [11.0.2] - 2021-4-12

### Changed

- List of PRs in the Pull Requests section automatically refreshes after reconnecting to a previously disconnected service

### Fixed

- Addresses [#488](https://github.com/TeamCodeStream/CodeStream/issues/488) &mdash; Can't save custom MR query
- Addresses [#486](https://github.com/TeamCodeStream/CodeStream/issues/486) &mdash; Unexpected error clicking on a merge request after update to 11.0
- Addresses [#483](https://github.com/TeamCodeStream/CodeStream/issues/483) &mdash; Error loading git info when trying to ammend a feedback request
- Addresses [#482](https://github.com/TeamCodeStream/CodeStream/issues/482) &mdash; Gitlab open merge request error field 'approvalsRequired'
- Fixes field 'stages' doesn't exist on type 'Pipeline' on GitLab Self-Managed 13.2.3
- Fixes field 'currentUser' doesn't exist on type 'Query' on GitLab Self-Managed 12.X and below
- Fixes field 'approvalsLeft' doesn't exist on type 'MergeRequest'
- Fixes field 'id' doesn't exist on type 'User' on GitLab Self-Managed 12.X and below
- Addresses [#470](https://github.com/TeamCodeStream/CodeStream/issues/470) &mdash; Shouldn't be able to submit review with zero pending comments
- Fixes an issue with the Template dropdown incorrectly being displayed when creating a PR on GitHub
- Fixes an issue with the display of the "source branch is X commit behind the target branch" copy in a merge request
- Fixes an issue with line breaks getting lost in the description of a feedback request
- Fixes an issue where you can't dismiss a feedback request when opening it via a toast notification on top of an open pull request
- Fixes an error clicking on the Files Changed tab of a pull request

## [11.0.1] - 2021-4-7

### Fixed

- Fixes an issue that would cause blue badges to appear for codemarks/feedback requests even if they didn't have unread replies

## [11.0.0] - 2021-4-7

### Added

- Adds support for [managing and reviewing GitLab merge requests](http://www.codestream.com/blog/codestream-11-0-manage-gitlab-merge-requests-code-reviews-and-issues-in-vscode-jetbrains)
- Adds blue unread-message badges in the Feedback Requests and Codemarks sections when there are new replies

### Changed

- Replaced the "Reject" button in feedback requests with "Request Changes"
- Renamed the "Needs Works" section in Feedback Requests to "Changes Requested"

### Fixed

- Fixes an issue where Cmd + Enter submits a feedback request with no changes selected
- Fixes an issue where you'd get prompted to review changes after changing branches
- Fixes an issue where the Linear integration wasn't recognizing multiple teams
- Fixes an issue where the assignees list wasn't complete when creating an issue on GitLab
- Fixes an issue with an extraneous entry appearing in the branch dropdowns when creating a pull request
- Fixes an issue with Shift+Click not working on Windows when trying to select a range of commits to review in a pull request
- Fixes an issue with the Feedback menu item under the headshot menu not working

## [10.7.2] - 2021-3-23

### Changed

- Toast notifications for commits are shown even if a feedback request already exists for the given commmit, as long as the feedback request is still open
- The heading of the Codemarks section now shows the number of open codemarks when the section is collapsed

### Fixed

- Fixes an unexpected error when clicking on the Files Changed tab in a pull request

## [10.7.1] - 2021-3-17

### Added

- Adds the ability to set up the Jira Server (v8.14.0 or later) integration using an API token
- Ability to create a pull request against a fork on GitHub Enterprise

### Changed

- Local changes now only block creation of a pull request when done in the context of a feedback request, otherwise it's just a warning
- When creating a pull request, if the diff is huge it is now not displayed by default
- Minor change to the navigation in the sign up/in flow when authenticating via a 3rd party
- UX improvement to the Notification Settings page
- When a teammate proactively creates a feedback request to review a commit of yours, you are now shown as the code author for that feedback request and it will appear in the "Open" section of the Feedback Requests section

### Fixed

- Addresses [#348](https://github.com/TeamCodeStream/CodeStream/issues/348) &mdash; Fixes an issue with checking out to a pull request's branch when the repo name included upper case letters
- Fixes an issue that would result in an unexpected error when clicking on a feedback request

## [10.7.0] - 2021-3-9

### Added

- Adds toast notifications prompting you to review new commits from a teammate after you do a pull
- Adds the ability to review changes in a pull request since your last review, or for a specific range of commits

### Changed

- When you resovle a codemark the modal is now automatically closed
- When creating a feedback request from an auto-prompt, the first line of the commit message is used as the FR title and anything after a newline character goes into the description
- Moved repository/branch information into the header of feedback requests
- Improved support for SSH aliases to prevent "The git repository for this review is not currently open in the IDE" messages from incorrecly being displayed

### Fixed

- Fixes an issue with the you-don't-have-this-file warning, when you view a codemark in a file that doesn't exist in your branch, not persisting
- Addresses [#406](https://github.com/TeamCodeStream/CodeStream/issues/406) &mdash; Inject as comment inserts at wrong marker location
- Addresses [#338](https://github.com/TeamCodeStream/CodeStream/issues/338) &mdash; multiline code break (newline) markdown not rendering inside code block syntax
- Fixes an issue with attaching files via copy-and-paste
- Fixes an issue with codemarks created on Windows showing a diff for the codeblock when there wasn't one
- Fixes an issue where pull_request_template.md files in uppercase weren't being recognized when creating a PR
- Fixes an issue with the inline display of images with a ? in the file name

## [10.6.1] - 2021-2-26

### Added

- Addresses [#411](https://github.com/TeamCodeStream/CodeStream/issues/411) &mdash; Case sensitive branch names

### Changed

- Even if Line Number is the selected sort, the sorting of the Codemarks section is always Date unless Current File is the selected filter

### Fixed

- Fixes an issue with connecting on on-prem services, such as GitHub Entperise and Bitbucket Server
- Addresses [#408](https://github.com/TeamCodeStream/CodeStream/issues/408) &mdash; Codemark not showing code block with Russian characters
- Fixes an issue when clicking on icons in the editor gutter for pull request comments from Bitbucket or GitLab
- Fixes an issue with viewing diffs for pull requests from forks
- Fixes an issue where manually entering triple backticks when adding a code block to a post breaks the formatting of the post
- Fixes an issue where the contents of the Codemarks section would unecessarily reload when switching files within the same repo
- Fixes an issue when clicking to see git diff in review window would trigger an undefined error

## [10.6.0] - 2021-2-19

### Added

- Adds the ability to review a pull request by a specific commit
- Adds a new onboarding tour focussed on educating new users on CodeStream's key features
- Adds a "Shared To" section to codemarks and feedback requests indicating when the item was shared to Slack
- Adds an [automated post to Slack](https://www.codestream.com/blog/codestream-10-6-discussion-resolutions-published-to-slack) when a shared codemark or feedback request has been resolved
- Adds the feedback request title to the toast notification when the request is approved, rejected ot reopened

### Fixed

- Fixes an issue with “disable strict SSL” setting not working for self-hosted services
- Fixes an issue with an HTTPS-Required popup incorrectly showing for new on-prem installations
- Addresses [#388](https://github.com/TeamCodeStream/CodeStream/issues/388) &mdash; Codemark issue with filenames containing "+" char
- Fixes an unexpected error when clicking on a pull request
- Fixes an issue with the count in the heading of the Coedmarks section being incorrect when filter isn't set to the current file
- Fixes an issue commenting in a pull request in a file in a folder that doesn't exist in your current branch 
- Fixes an issue with the Slack integration not appearing as a green tile on the Integrations page immediately after connecting
- Fixes an issue with the Locate button not working in a feedback request when you don't have the given repo open
- Fixes an issue with commenting on code in files that are symlinks

## [10.5.1] - 2021-2-10

### Fixed

- Fixes an issue that caused an 'Unexpected Error' screen on sign-in

## [10.5.0] - 2021-2-9

### Added

- Adds checkbox to the Notifications page to control the new Feedback Request Reminder email notification

### Changed

- Comment codemarks can now be resolved
- The Codemarks section of the sidebar breaks out codemarks by status (open, resolved, archived) with new colors for each
- Default filters on the Search page are now Open Issues, Open Code Comments, and Open Feedback Requests, and is:open / is:closed advanced syntax now includes comment codemarks
- CodeStream on-prem customers can now connect to Jira's cloud service using API tokens instead of OAuth

### Fixed

- Fixes issue that prevented pull request creation on github.io repositories
- Fixes an issue with invitation codes for on-prem customers not correctly setting the CodeStream server URL for the invitee
- Fixes an issue when commenting on a pull request that has been sitting open for more than an hour
- Fixes a formatting issue with issues created on Asana

## [10.4.3] - 2021-2-6

### Fixed

- Addresses [#392](https://github.com/TeamCodeStream/CodeStream/issues/392) &mdash; Codemark not showing code block when created from Windows 

## [10.4.2] - 2021-1-29

### Added

- Adds a new tree view in the Changed Files section of feedback requests

### Changed

- Stop sending toast notifications for closed pull requests

### Fixed

- Fixes an issue with creating comment codemarks in a VS Code remote development environment
- Fixes an issue with commenting in a feedback request in a file with an @ in the name
- Fixes an issue preventing you from being able to edit a feedback request
- Fixes an issue creating an issue codemark on GitLab cloud

# Change Log

## [10.4.1] - 2021-1-26

### Added

- Adds the ability to attach files to a feedback request, or to a reply
- Adds support for custom queries for Jira Server in the Issues section
- Adds a prompt to create a feedback request when you commit code, which can be turned off via a toggle above the form
- Adds support for initiating a comment from GitLens hovers

### Changed

- Automatically populate all reviewer slots in a feedback request, going to recent committers if necessary, if one of the "authorship" assignment options is selected

### Fixed

- Addresses [#380](https://github.com/TeamCodeStream/CodeStream/issues/380) &mdash; Viewing a PR with status checks on GitHub Enterprise generates an error 
- Addresses [#376](https://github.com/TeamCodeStream/CodeStream/issues/376) &mdash; Can't exit preview mode when creating a feedback request
- Fixes an issue where you'd end up in an infinite "Fetching repo..." loop trying to create an issue on Bitbucket
- Fixes an issue creating a permalink when in a WSL environment

## [10.4.0] - 2021-1-19

### Added

- Adds support for [file attachments](https://www.codestream.com/blog/codestream-10-4-file-attachments-github-status-checks) when creating comment or issue codemarks
- Adds support for GitHub status checks in pull requests rendered in CodeStream
- When selecting a Linear issue to start work, the branch name associated with the issue is used
- Adds the ability to pull the latest, if the base branch is behind origin, when previewing diffs while creating a pull request

### Changed2

- Prevent the creation of codemarks when in a preview diff while submitting a feedback request
- Suppress the Notifications section of pull request details in VS Code because GitHub auth through VS Code doesn't provide the appropriate scope

### Fixed

- Addresses [#353](https://github.com/TeamCodeStream/CodeStream/issues/353) &mdash; Codemark glyphs do not show up in WSL environment
- Fixes an issue where starting work on an issue creates a feature branch against the wrong base
- Fixes a data integrity issue that led to a small group of users getting an error clicking on a codemark
- Fixes with the fetching of too much history data from PubNub if client clock is inaccurately set
- Performance improvements
- Fixes an issue with feedback requests assigned to you not appearing in the Approved or Needs Work sections without a reload

## [10.3.0] - 2021-1-8

### Added

- Adds a new integration with the Linear issue-tracking service
- Adds an [integration with GitLens](https://medium.com/teamcodestream/how-we-extended-gitlens-pull-request-functionality-in-visual-studio-code-f4dbecbea4c2) which allows you to create and view pull requests using CodeStream

### Fixed

- Addresses [#364](https://github.com/TeamCodeStream/CodeStream/issues/364) &mdash; Copy button in PR is copying the base branch name instead of the compare branch
- Fixes an issue where the Open File button in the Tree View of the list of files in a PR wouldn't open the correct file if sections of the tree were collapsed

## [10.2.2] - 2020-12-30

### Added

- Split the Feedback Requests section of the sidebar into sections for Open, Approved and Needs Work 
- When selecting a ticket to start work, added an option to pull latest if base branch is behind origin
- Added the ability to set a default base branch per repo when creating a feature branch  

## [10.2.1] - 2020-12-23

### Added

- Adds a new onboarding flow for some users that guides them through the setup of integrations and creating their first code comment
- Adds support for remotes using SSH aliases 

### Changed

- When creating a feedback request only commits from current user are checked by default, and only if they include the most recent commit
- The list in the Pull Requests section automatically updates when you open, close or merge a pull request from CodeStream
- The hovers for icons in the editor gutter now make it clear if the discussion was a comment, issue, feedback request or pull request
- Optimization of git operations to gather commits when creating a feedback request

### Fixed

- Fixes an issue where CodeStream would repeatedly reload
- Fixes an issue that would create an error when clicking on a feedback request due to bad data

## [10.2.0] - 2020-12-17

### Added

- Adds new onboarding settings for team admins that allow people to join teams based on repository access, and allow admins to restrict integration and authentication options
- Adds a warning if you have local changes when trying to create a pull request
- Adds new gear menu to header of the My Team section to access team settings and administration

### Fixed

- Fixes an issue where some users would run into GitHub rate limiting issues when working with pull requests
- Fixes an issue where the markdown preview for commenting in a pull request was always empty
- Fixes an issue where adding multiple code blocks to a codemark would result in some not getting added
- Fixes an issue where a GitHub disconnect banner would incorrectly appear due to lack of internet connectivity

## [10.1.2] - 2020-12-4

### Added

- Adds the "Outdated" label to comments on outdated code displayed in a pull request
- Improved diff creation for feedback requests so that you should rarley see the “a commit required to perform this review was not found in the local repository” message

### Fixed

- Fixes an issue where multiple lines of code displayed in a code fence were collapsed down to a single line
- Fixes an issue where Start Work would break if selected a CodeStream issue and the branch template used only {id}
- Fixes an issue where a feedback request couldn't be submitted against a brand new repo with a single commit
- Fixes an issue with the "show instructions" link at the bottom of a feedback request that has replies
- Fixes an off-by-1 issue in the display of comments on the Conversation tab in pull requests

## [10.1.1] - 2020-11-25

### Fixed

- Fixes an issue that prevented you from starting a review when commenting in a pull request

## [10.1.0] - 2020-11-24

### Added

- Add an integration with Clubhouse that allows you to create stories and see your backlog
- Adds the ability to create a GitHub pull request across forks

### Changed

- Improves the UX on the form to submit a review in a pull request by making it clear that the Cancel button is for cancelling the review, and not dismissing the form
- Clarifies that when commenting on code outside of the changeset in a pull request, while a review is pending, the comment is added at the PR level and not included in the review

### Fixed

- Fixes an issue where the icons for pull request comments would be displayed on the wrong line in the gutter of the diff
- Fixes an issue that would result in an error trying to view a pull request
- Addresses [#296](https://github.com/TeamCodeStream/CodeStream/issues/296) &mdash; "Error 401: Unauthorized" when opening a PR on GitLab Self Managed
- Fixes an issue where the viewed status of files in the pull request would get reset after adding a comment
- Fixes an issue that prevented the creation of single pull request comments with certain GitHub Enterprise instances
- Fixes an issue where files would not be displayed in tree view of a pull request if the folder name was a superset of another folder name

## [10.0.6] - 2020-11-13

### Added

- Adds the ability to react to a comment, issue or feedback request, whereas you previously could only react to a reply

### Changed

- Changed the default branch name template to just use the issue's title
- Clicking on an icon in the gutter of a pull-request diff now scrolls you to the corresponding comment
- Improved logic for naming repositories to prioritize upstream and origin remotes

### Fixed

- Fixes an issue that prevented pull request comments from being displayed immediately as icons in the diff gutter
- Fixes an issue that would prevent you from viewing a pull request that had a team as a reviewer
- Fixes an issue that would generate an error if you reloaded while configuring an on-prem issue tracking/code hosting service

## [10.0.5] - 2020-11-13

### Added

- Adds the ability to mention GitHub collaborators when commenting on a pull request
- Adds typeahead search when selecting branches for a new pull request

### Changed

- After creating a pull request, when you then close it you are brought to the CodeStream sidebar instead of back to the Open a Pull Request page
- Provide more guidance for users trying to sign up/in with GitLab regarding the need to have a public primary email on GitLab
- The "Work in Progress" section is now more performant, with reduced api requests

### Fixed

- Addresses [#322](https://github.com/TeamCodeStream/CodeStream/issues/322) &mdash; When creating a pull request on GitLab or Bitbucket, CodeStream would try to open it in the IDE instead of on the appropriate service
- Addresses [#315](https://github.com/TeamCodeStream/CodeStream/issues/315) &mdash; Creating a PR on GitLab Self-Managed switches base branch with compare branch
- Fixes an issue trying to view a pull request in a repo with more than 100 open or merged pull requests
- Fixes an issue where our polling for updates to a pull request would trigger an error when the user comes back from beign offline
- Fixes an issue with Open Local File not working from the Files Changed tab in a pull request
- Fixes an issue that would prevent you from creating a pull request if you had repos from both GitHub and GitHub Entperise open in your IDE

## [10.0.4] - 2020-11-5

### Added

- Adds support for Azure DevOps issue tracking in the Issues section of the CodeStream pane

### Changed

- After creating a pull request on GitHub Enterprise you are now taken right into the newly created pull request on CodeStream
- Toast notifications for when you're added as a reviewer or assignee to a pull request are now not limited to open pull requests
- Better messaging when you try to create a pull request with no repositories open
- Updated Slack app to use Slack's new granular permissions

### Fixed

- Fixes an issue where pull requests from older versions of GitHub Enterprise wouldn't load
- Fixes an issue where the list of projects and the list of assignees where not list alphabetically when creating an issue on Azure DevOps
- Fixes an issue where you'd receive a toast notification when assiging a pull request to yourself
- Fixes an issue where the default notifications settings weren't being reflected on the Notifications page for new users
- Fixes an issue where the editing of a range in a mult-range codemark caused a change in the ordering of the ranges
- Fixes an issue with some modals having two "X"s to dismiss
- Fixes an issue with ESC not properly dismissing modals/pages
- Fixes an issue where certain actions would inappropriately land you in spatial view

## [10.0.3] - 2020-10-28

### Added

- Adds a new VS Code-based GitHub authentication flow that is much simpler
- Adds the ability, in a codemark with multiple code blocks, to intersperse the blocks of code in the codemark text by referencing them with `[#1]`

### Changed

- Changed reference to "requested a review" in activity feed to "requested feedback"
- Replaces "upgrade" link under headshot menu with sales@codestream.com for on-prem customers
- Improve performance and reduce memory usage by caching some expensive git operations

### Fixed

- Addresses [#301](https://github.com/TeamCodeStream/CodeStream/issues/301) &mdash; Creating Feedback Request fails
- Fixes an issue where, after adding a code comment in a pull request, the icon in the diff gutter would not appear immediately
- Fixes an issue where creating a pull request or feedback request from the WIP section didn't default to the correct repo
- Fixes an issue with "/dev/null" entries appearing in list of files when creating a pull request
- Fixes an issue with the Pull Requests section not immediately appearing if you open a GitHub or GitHub Enterprise repository

## [10.0.2] - 2020-10-27

### Fixed

- Fixes an issue viewing pull requests with GitHub Enterprise

## [10.0.1] - 2020-10-16

### Fixed

- Fixes an issue where authentication with your code host would seem to fail if you didn't have a repo from that code host open in your IDE

## [10.0.0] - 2020-10-15

Note that CodeStream 10.0 requires VS Code version 1.50.

### Added

- Adds the ability to submit a review in a pull request without having to first start a review via a code comment
- Code Reviews have been renamed Feedback Requests to better reflect the fact that they are more informal, and are used more frequently, to get feedback on your work in progress throughout the development process
- Adds the ability to jump to your local version of a file from any comment in a pull request
- Adds two new ways to view changes in a pull request. Tree view, which is similar to the current List view, but organizes the files as they’d appear in a source tree. And Diff Hunks view, which is the same view you’re used to seeing on GitHub. List and Tree view provide full-file context, whereas Diff Hunks shows just the lines that changed.
- In any of the three views, mark any file as not viewed if you want to indicate to yourself that you need to come back to it again
- Adds a new Data Export tool, for team admins only, that dumps all code comments (including those done in a feedback request) in CSV format

### Changed

- All-new tree based UI persistently exposes everything you need access to, and everything you need to do
- The CodeStream extension now lives in the VS Code sidebar, and has a corresponding entry in the activity bar
- The interface for commenting on code has been improved so that you’re clear on what code block, if any, has been selected. It’s also easier to add additional ranges.
- When there’s a diff between the code in a codemark and the version you have locally, the original version, the current version, and a diff are all included in the codemark. No need to open a separate diff.
- The Pull Requests section of the sidebar now includes a “Recent” section that shows you your five most recently created PRs, regardless of their current state.
- When reviewing a pull request and commenting on code that isn't part of the changeset, it's now clear that the comment will be added as a PR-level comment and not as part of the review (due to GitHub's limitations)
- When in spatial view of codemarks, there are now clearer indicators of when there are other codemarks above or below the fold

### Fixed

- Fixes an issue where the Work in Progress section would not update unless you first visited the Team tab
- Fixes an issue with search incorrectly being case sensitive

## [9.1.0] - 2020-10-6

### Added

- Adds toast notifications for when you've been assigned a new pull request that opens the PR in your IDE

### Changed

- Implemented Google's diff-match-patch as a fallback for maintaining the location of all markers and pull-request comments

### Fixed

- Fixes an issue with long delays in opening diffs in a code review
- Fixes an issue where the status of viewed files in a PR would get reset if you cancelled the submission of a comment
- Fixes an issue with codemarks being displayed at the top of a file rather than their correct location
- Fixes an issue preventing users from creating pull request comments on the last line of a file
- Fixes an issue that prevented you from closing a pull request from CodeStream
- Fixes an issue where you couldn't open a pull request diff immediately after opening the repo
- Fixes an issue where the "Rebase & merge" button in a PR wouldn't work without a reload

## [9.0.2] - 2020-9-28

### Fixed

- Fixes an issue with the GitHub Enterprise configuration step being skipped when connecting from the Pull Requests section of the Tasks tab
- Fixes an issue where you'd get an error about not having the repo open, when you actually did, when trying to comment on a pull request

## [9.0.1] - 2020-9-23

### Added

- Better error handling for the GitHub pull-request integration, particularly around OAuth issues
- Adds support for Kerberos when creating pull requests from CodeStream
- Pull requests now reflect require-reviewers status

### Changed

- Removed the 5-person team size limit for companies on CodeStream's Free plan

### Fixed

- Fixes an issue where the icon would not appear in the editor gutter right away for a newly created codemark
- Fixes an issue with opening a PR from a repo that you no longer have locally
- Fixes an issue with the caching of GitHub access tokens

## [9.0.0] - 2020-9-17

### Added

- Adds support for GitHub templates when creating a pull request
- Adds the ability to create custom GitHub queries to control which pull requests are displayed on the Tasks tab
- Adds the ability to quickly name a code review or pull request based on ticket name, branch name or commit message

### Changed

- Display of pull requests on the Tasks tab is now broken into sections for Waiting on My Review, Assigned to Me, and Created by Me
- By default, only pull requests associated with repos you have open in your IDE are display, but you also have the ability to show all pull requests
- Allows for the selection of remote branches when creating a PR
- On the Search tab you can now use multiple `tag` arguments to create an AND query
- When the Current File tab is in list view, multi-range codemarks are now only listed once
- When creating a codemark, we now remember the last state of the checkbox(es) for any non-member notifications
- Move cloud authentication options to the top of the signup page

### Fixed

- Fixes an issue with creating codemarks in cshtml files
- Fixes an issue with creating codemarks in a file in a renamed folder on the file system with a new name that varies only by case
- Fixes an issue where the position of codemarks could not be determined

## [8.3.7] - 2020-9-9

### Added

- Adds support for GitHub Enterprise to the new Pull Request integration (beta)
- Adds new keyboard shortcuts for creating pull/merge requests

### Fixed

- Fixes an issue with the repo matching strategy when viewing file diffs in a pull request
- Fixes an issue with an unexpected error when opening certain PRs
- Fixes an issue with CodeStream not correctly recognizing that you're already connected to GitHub when creating a PR
- Fixes an issue where, after opening a new repo, the list of repos didn't updating automatically when starting work on a ticket, creating a PR, or requesting a code review

## [8.3.6] - 2020-9-2

### Fixed

- Fixes an issue with codemarks not appearing on the Current File tab in certain instances

## [8.3.5] - 2020-9-1

### Added

- Adds support for managing GitHub (cloud only) pull requests and doing PR-based code reviews (BETA)

## [8.3.4] - 2020-8-27

### Fixed

- Fixes an issue related to certain upper-case paths

## [8.3.3] - 2020-8-21

### Fixed

- Fixes an issue with certain scenarios not suggesting appropriate default reviewers using the "authorship" model

## [8.3.2] - 2020-8-13

### Fixed

- Addresses [#224](https://github.com/TeamCodeStream/CodeStream/issues/234) &mdash; Bug with Code range function
- Fixes an issue with the handling of invalid Jira queries
- Fixes an issue with the display of newlines in comments when amending a code review
- Fixes an issue with the handling of renamed files in a code review
- Fixes an issue when editing a codemark with no code block

## [8.3.1] - 2020-8-6

### Fixed

- Fixes an issue where lower case paths were being used in git operations

## [8.3.0] - 2020-8-3

### Added

- Adds the ability to sign into CodeStream with GitLab and Bitbucket
- Adds the ability to jump to a file from the Changed Files section of a code review, in addition to opening the diff
- Adds the ability to upgrade to a paid plan from under the ellipses menu

### Changed

- Team admin capabilities have been relocated to under the ellipses menu for easier access
- Code review progress now survives a reload of your IDE, and is tracked separately for each review update

### Fixed

- Fixes an issue with creating a pull request in projects located inside a subgroup
- Fixes an issues with renamed files in a code review

## [8.2.0] - 2020-7-21

### Added

- Adds the ability to create custom JQL queries to filter the list of Jira tickets
- Adds self-serve payments when subscribing to CodeStream
- Adds a spinner/indicator when diffs are being calculated as a result of new commits being added to a code review

### Changed

- Improved UX when creating a Jira ticket from CodeStream
- Jira tickets now use approropriate icons based on the ticket type
- Improved "start work" UX, particularly around creating a branch
- When creating a blame map (team admins only) you can now select from a drop-down list of emails
- Improved the display of modals throughout the service
- Search box is not displayed in the "What are you working on?" section if there are no tickets listed
- Restructured the initial landing page in the extension to make things clearer for people signing up

### Fixed

- Fixes an issue where you weren't able to adjust notification settings if your on-prem installation didn't have outbound email configured
- Fixes an issue where illegal characters weren't being stripped out of the name when creating a branch

## [8.1.3] - 2020-7-16

### Added

- Adds the ability to specify your time zone via your Profile page

### Fixed

- Fixes an issue where diffs would be missing when amending a review with pushed commits
- Fixes an issue with extraneous blank lines getting added to code blocks in comments on a code review
- Addresses [#208](https://github.com/TeamCodeStream/CodeStream/issues/208) &mdash;[Object object] error when trying to submit a large review
- Fixes an issue that would allow you to submit a code review before the list of changed files updated based on changes to the selection of commits
- Fixes the broken "skip this" link in the "What are you working on?" section of the Tasks tab

## [8.1.2] - 2020-7-9

### Added

- Adds the ability to update your status on Slack when selecting a task to start work on
- Adds the ability to create pull requests in Bitbucket Server
- Adds the ability to select tickets from Jira and Jira Server, and update their statuses when you start work
- Adds a dismissable banner when CodeStream is set up in an editor group instead of its own pane
- Adds ticket status to the display of tickets in "What are you working on?"
- Adds the display of local commits to the Work In Progress section of the Tasks tab

### Changed

- Changed the name of the Work Items tab to Tasks
- Changed the UI for selecting commits to be included in a code review to make it clear that they have to be sequential
- Removed the ability to set a keybinding for individual codemarks
- Changed the display of the CodeStream entry in the VS Code status bar to always include "CodeStream"
- Improved the UI for selecting a base branch when creating a feature branch from CodeStream
- Reviews in the Open Reviews section of the Tasks tab are now displayed in descending order

### Fixed

- Fixes an issue with a source file opening when you hover over a code block in the activity, while CodeStream resides in the editor group
- Fixes an issue with creating a codemark when opening the form while the permalink form is still in view
- Fixes an issue with the Loading spinner display when connecting to an issue tracking service via the Tasks tab
- Fixes an issue where the board/list dropdowns didn't have a default selection when creating an issue on Trello
- Fixes an issue where the form to amend a review would not be displayed fully in view
- Fixes an issue where the blue + button was sometimes still accessible when a modal was being displayed

## [8.1.1] - 2020-7-3

### Added

- Adds the ability to search tickets in the "What are you working on" section of Work Items
- Adds the ability to create an ad-hoc work item or create a ticket on your issue-tracking service
- Adds a button to refresh the list of tickets from your issue tracking service

### Changed

- Simplified the form for creating branch templates for team admins
- The Open Reviews section on the Work Items tab now includes reviews that you requested in additon to reviews assigned to you

### Fixed

- Fixes an issue with a banner not being displayed when you have no connectivity
- Fixes an issue with the wrapping of your status display on the Team tab

## [8.1.0] - 2020-7-1

### Added

- Adds a new Work Items tab that summarizes everything on your plate, including open code reviews, your work in progress, and your backlog from your issue tracker

### Changed

- The + menu has moved from the top navigation to the bottom-right of the CodeStream pane

## [8.0.2] - 2020-6-24

### Changed

- Ignore untracked files when creating a pull request from a code review

## [8.0.1] - 2020-6-24

### Added

- Adds "Start Work" support for GitHub Enterprise, Gitlab Self-Managed, and Jira subtasks

### Fixed

- Fixes an issue that caused you to land on Getting Started after every reload or sign-in

## [8.0.0] - 2020-6-22

### Added

- Adds the ability to "start work" by selecting a ticket (Trello, Jira, etc.), moving it to the appropriate in-progress state, and automatically creating a feature branch
- Adds support for creating PRs in Bitbucket (cloud)
- Adds the ability to create add an upstream branch when creating a PR

## [7.4.2] - 2020-6-20

### Added

- Adds the ability to create a pull request on GitHub or GitLab (cloud or on-prem) once a code review has been approved
- Adds a more granular Help submenu
- If your CodeStream email doesn't match your git email, you can now map your git email to your CodeStream email
- Code ownership can also be reassigned as part of assigning reviewers in a code review

## [7.4.1] - 2020-6-9

### Fixed

- Fixes an issue where the current user would be added as a suggested reviewer in a code review

## [7.4.0] - 2020-6-8

### Added

- Adds the ability to notify people via email about codemarks or code review assignments, even if they aren't yet on your CodeStream team
- Adds a CodeStream entry to the VS Code Source Control view to see your open code reviews and review assigned to you

### Changed

- Icons for creating codemarks now appear when you hover in the gutter, or select code in your editor, on most top-level pages and not just on the Current File tab
- Change request titles at the top of a code review now link to the referenced codemark isntead of marking the request complete
- Entry of invite codes is now on the initial page in the extension to make it easier for teammates to join

### Fixed

- Fixes an issue where opening a code review via permalink or from Slack would result in an error in the IDE

## [7.3.0] - 2020-5-29

### Added

- Adds the ability to ammend a code review with new code changes

### Fixed

- Addresses [#195](https://github.com/TeamCodeStream/CodeStream/issues/195) &mdash; .codestreamignore should accept directory/wildcard/regex exclusions

## [7.2.6] - 2020-5-22

### Fixed

- Fixes an issue that prevented signup via GitHub

## [7.2.5] - 2020-5-21

### Added

- Adds support for authentication with Okta for CodeStream On-Prem installations

## [7.2.4] - 2020-5-19

### Changed

- Expose strictSSL requirement setting for Cloud installations

### Fixed

- Fixes an issue where reviews of uncommitted changes in branches containing unpushed commits include the changes from those commits
- Fixes an issue with flashing headshots on the Search tab when the editor is scrolled

## [7.2.3] - 2020-5-18

### Added

- Adds the ability to react to posts with emoji
- Adds the display of the server URL to the bottom of the initial page in the extension, for the benefit of on-prem installations

### Changed

- Improved display of nested replies in a code review's thread

### Fixed

- Addresses [#192](https://github.com/TeamCodeStream/CodeStream/issues/192) &mdash; Adopt VS Code's 'asWebviewUri' API
- Fixes several performance issues associated with the git watcher

## [7.2.2] - 2020-5-15

### Added

- Command palette, editor context menu, and codelens action menu all now include a Create Review option

### Changed

- Requesting a code code review now shows earlier commits if no unique commits can be found on the branch
- Team tab now provides invite codes for on-prem installations running without outbound email
- PR toggle on the Current File tab is suppressed for on-prem installations not using https

### Fixed

- Addresses [#187](https://github.com/TeamCodeStream/CodeStream/issues/187) &mdash; Git error with empty file
- Addresses [#158](https://github.com/TeamCodeStream/CodeStream/issues/187) &mdash; Can't paste HTML tags
- Fixes an issue where editing a reply removed any formatting
- Fixes an issue where pasted HTML would get rendered in a reply

## [7.2.1] - 2020-5-6

### Added

- Addresses [#88](https://github.com/TeamCodeStream/CodeStream/issues/88) &mdash; Support VS Code remote development
- Adds new profile pages, accessible by clicking on headshots throughout CodeStream

### Changed

- If you don't have a given repo open when performing a code review you are now able to locate it on disk
- Warning about not having a commit when performing a code review now automatically goes away once you get the commit
- Code review form now automatically recognizes when files are stages or commits are pushed

### Fixed

- Addresses [#181](https://github.com/TeamCodeStream/CodeStream/issues/181) &mdash; Prevent spawning of external git diff tools
- Fixes an issue with repo selection not always being correct the very first time you request a code review
- Fixes an issue where warning about unsaved changes when requesting a code review only display on Windows
- Fixes issues with Esc not always closing various modals and panels
- Fixes an issue with the default code review title not updating when you switched repos
- Fixes an issue where a code review would incorrectly indicate that it included uncommitted local changes

## [7.2.0] - 2020-4-28

### Added

- Adds the ability to require all reviewers assigned to a code review to approve it individually
- Adds the ability for admins to control code review approval requirements
- Adds the ability for adds to control if/how reviewers are suggested for code reviews

### Changed

- The status dropdown and ellipses menu for a code review or issue codemark in the activity feed have been consolidated
- Headshots for issue and code review assignees are now displayed at the right side of activity feed entries
- Truncates the display of the review title when viewing a code review diff
- Updated copy on first extension page to clarify the Create vs Join team choice
- Increased the contrast of menu backgrounds for easier visibility

### Fixed

- Addresses [#178](https://github.com/TeamCodeStream/CodeStream/issues/178) &mdash; Incorrect Jira URL
- Fixes an issue with permanently excluded files appearing in a code review
- Fixes an issue with new or deleted files not being identified as such in code reviews
- Fixes an issue with the ellipses menu missing for closed code reviews
- Fixes an issue where long code review names would render poorly
- Fixes an issue where live-view hovers on the Team tab wouldn't handle large amounts of content

## [7.1.1] - 2020-4-20

### Fixed

- Fixes an issue that omitted the number of changes for modified files in certain code reviews

## [7.1.0] - 2020-4-20

### Added

- Adds new integrations with GitHub Enterprise and GitLab Self-Managed that leverage personal access tokens and no longer require your instance to be publicly accessible
- Adds the ability to send invitation codes on your own in case CodeStream invitation emails are being blocked by your organization
- Adds a way to clear the search box on the Filter & Search tab
- Adds the ability to remove a previously connected Jira Server host

### Changed

- General UI improvements to code reviews, including a warning about open change requests, clearer button copy, etc.

### Fixed

- Fixes an issue where the Submit button on the codemark form was not responsive
- Fixes an issue where new files are still listed in "modified files" even if saved and staged changes are not selected
- Fixes an issue where canceling a review results in the re-rendering of the review form

## [7.0.2] - 2020-4-14

### Fixed

- Fixes an issue with codemarks not appearing in the Current File view for uncommitted files
- Fixes an issue with the CodeStream pane not opening by default after initial installation
- Fixes an issue with the CodeStream pane opening when it had previously been closed when opening VSC from the command line
- Fixes an issue with the "What's New" popup appearing for new CodeStream installations

## [7.0.1] - 2020-4-10

### Added

- Adds the ability to change your email address
- Adds a new guided tour for new users
- Adds a new consolidated Integrations page, simplifying the ellipses menu
- Adds the ability to add a profile photo by specifying a URL
- Adds the ability to remove an invited user from the team
- Adds a list of suggested invitees based on git commit history (for team admins only)

### Changed

- Creating a codemark via the plus menu will now recognize if you have a block of code selected in the editor

### Fixed

- Fixes an issue with assignees not being added to tickets created on Jira
- Fixes an issue with sharing very large posts to Slack

## [7.0.0] - 2020-4-3

### Added

- Code review functionality is no longer in private beta and is now available for all teams
- Adds new "Live View" of what your teammates are working, including warnings about potential merge conflicts
- Adds warnings to the top of the Current File view when a teammate is editing the same file or if there's a potential merge conflict
- Addresses [#162](https://github.com/TeamCodeStream/CodeStream/issues/162) &mdash; Adds admin capabilities and team settings
- Adds the ability for an admin to rename the team
- Adds the ability for an admin to assign/remove admin privileges
- Adds the ability for an admin to remove people from the team
- Adds the ability for an admin to control Live View usage for the team
- Adds the ability for users to change their username
- Adds the ability for users to change their full name
- Adds the ability for users to cancel their accounts

### Changed

- Changes status bar entry from "Sign in..." to "CodeStream" when user is signed out
- Prevents the creation of codemarks when viewing a non-code review diff

### Fixed

- Fixes [#160](https://github.com/TeamCodeStream/CodeStream/issues/160) &mdash; Blank CodeStream pane after starting up VSC
- Fixes [#166](https://github.com/TeamCodeStream/CodeStream/issues/166) &mdash; Error creating codemarks
- Fixes [#168](https://github.com/TeamCodeStream/CodeStream/issues/168) &mdash; Can't post issues to GitHub
- Fixes an issue with the diff for a new file added to a code review being blank

## [6.5.1] - 2020-4-1

### Fixed

- Fixes an issue receiving real-time events for on-prem customers

## [6.5.0] - 2020-3-31

### Added

- Adds the ability to sign into CodeStream with GitHub
- Adds the ability to navigate through files in a code review with either the mouse or a keyboard shortcut

## [6.4.0] - 2020-3-27

### Added

- Adds the ability to email and desktop notifications on/off separately
- Adds confirmation message after submitting a code review, or a codemark with no associated code block

### Changed

- When viewing a codemark the entire code block is now clickable and will open the given file

## [6.3.3] - 2020-3-24

### Added

- Mentions on CodeStream now flow through to Slack if there's a match on email address or username
- Adds the ability to view diffs for changed files while requesting a code review
- Adds the ability to share an existing code review to Slack or MS Teams
- When editing a code review and adding new reviewers, they are now notified via a mention
- Esc key now exits you from the code review request form, and from an in-progress code review

### Fixed

- Fixes an issue with the Compare and Apply buttons not appearing right away when there's a diff
- Fixes an issue with html being added to a code review description after editing it
- Fixes an issue with a user submitting a code review with no repos open in the IDE

## [6.3.2] - 2020-3-19

### Fixed

- Fixes an issue with codemarks getting created without a code block when the file path included Cyrillic characters
- Fixes an issue with codemarks getting created without a code block when the team contained replies from Slack users that weren't a member of the team

## [6.3.1] - 2020-3-17

### Added

- Added "Copy link" option to code review ellipses menu
- Added a reply icon on hover over any reply in a code review's thread

### Changed

- Change requests in a code review's thread are now identified with a new activity line (e.g., Dave requested a change)
- When opening a code review, there are now spinners to the left of the files until we are sure you can click on those files

### Fixed

- Fixes an issue with the "Open & Assigned to Me" filter not including issue codemarks
- Fixes an issue where the option to edit a reply to a code review was missing
- Fixes an error when creating a codemark in code review for a file that had permalinks
- Fixes an issue with diffs on new/added files in a code review
- Fixes an issue where diff was not displayed for files in directories that do not exist in current working tree
- Fixes an issue where code review creation fails silently if diffs are too large
- Fixes UI issues on the form to request a code review
- Fixes an issue with incorrect commits being included in a review after switching repos
- Fixes an issue where you'd get roadblocked when using "Open in IDE" with a review not associated with your active IDE window

## [6.3.0] - 2020-3-10

### Added

- Adds the ability to do [shift-left code reviews](<https://github.com/TeamCodeStream/CodeStream/wiki/Code-Review-(BETA)>). Currently in beta for VS Code. Contact us at support@codestream.com to participate.
- Adds the ability to create an issue not connected to a block of code via the + menu in the global nav

### Changed

- More robust Filter & Search tab with an improved UI, [advanced search syntax](https://github.com/TeamCodeStream/CodeStream/wiki/Filter-and-Search), and the ability to save custom filters
- More readable activity feed UI, with author/action separated out from each card

### Fixed

- Fixes an issue sharing to Slack when there are spaces in the remote URL

## [6.2.0] - 2020-2-19

### Added

- Adds the ability to share codemarks to Microsoft Teams

### Fixed

- Fixes an issue with access tokens expiring for the Jira integration

## [6.1.0] - 2020-2-3

### Added

- Adds the ability to create additional CodeStream teams from the ellipses menu in the top nav

### Changed

- The pull-request integrations will now display comments from open PRs if you are on either the source or destination branches

## [6.0.1] - 2020-1-27

### Fixed

- Fixes [#146](https://github.com/TeamCodeStream/CodeStream/issues/146) &mdash; Unclear that duplicated shortcut label means keychord
- Fixes an issue that could lead to degraded IDE performance when CodeStream is opened with very large source files
- Fixes an issue where the compose menu in the CodeStream pane would not persist if you switched files while code was selected

## [6.0.0] - 2020-1-14

### Added

- Adds a new Activity Feed to notify you about new codemarks and new replies to codemarks
- Adds the ability for CodeStream teams to optionally share codemarks to Slack, without requiring broad access to your workspace
- Adds the ability to share any existing codemark, including those created by teammates, to Slack
- Adds the ability to reply to codemarks from Slack via a "View Discussion & Reply" button
- Adds the ability to specify a default sharing destination on Slack per repo (look for gear menu at top of the channel-selection dropdown)
- Adds new codemark-centric email notifications, which allow you to post replies by simply replying to the email
- Adds new notification settings under the ellipses menu in the top nav
- Adds the ability to manually follow/unfollow individual codemarks to control notifications
- Adds the ability to create a codemark via the "+" button in the top nav, where the code block is optional
- Adds a new Team tab to the top nav where you can invite teammates and see those already on the team
- Adds repo name to the display of codemarks

### Changed

- Assignment of an issue (excluding those shared externally) is now treated like a mention so that the assignee is notified

### Fixed

- Fixes [#139](]https://github.com/TeamCodeStream/CodeStream/issues/139) &mdash; GitHub PR comments not showing up

## [5.2.5] - 2019-12-20

### Fixed

- Fixes an issue with repo matching on startup

## [5.2.4] - 2019-12-19

### Added

- Adds a roadblock to let people know when CodeStream can't connect due to possible proxy issues

### Changed

- The form to create a codemark is now keyboard navigable

### Fixed

- Fixes an issue with creating codemarks that include blank line at the end of a file
- Fixes a broken link on the form to configure the GitLab Self-Managed integration

## [5.2.3] - 2019-11-27

### Added

- Adds support for self-signed SSL certificates for CodeStream On-Prem
- Adds display of CodeStream version number at the bottom of the ellipses menu

### Fixed

- Fixes an issue with very large codemarks not being displayed on Slack
- Fixes an issue with "Open on GitHub" buttons not accounting for .com-githubHandle remote syntax

## [5.2.2] - 2019-11-19

### Added

- Adds support for merge request comments from GitLab via the "PR" toggle on the Current File tab

### Changed

- When you cancel the creation of a codemark you are now prompted to confirm the action<
- By default, codemarks are now displayed as glyphs in the editor even when the Current File tab is selected

### Fixed

- Fixes an issue with the display of codemarks, as well as the codemark creation form, near the bottom of a file
- Fixes an issue where Slack DMs sometimes weren't available for sharing a codemark

## [5.2.0] - 2019-11-6

### Changed

- Repo matching logic now also includes commit hashes to better handle scenarios where teammates don't have a common remote URL for the same repo

### Fixed

- Fixes an issue where the codemark compose form and the newly-created codemark would briefly appear at the same time
- Fixes an issue where the current codemark was available for selection as a related codemark

## [5.1.0] - 2019-10-30

### Added

- Adds "Open in IDE", "Open on Web" and "Open on GitHub" (or Bitbucket/GitLab) links to issues created in external issue-tracking services (Jira, Trello, etc.)
- Adds the ability to manually reposition a codemark in cases where its location isn't automatically updated based on changes to the code

### Changed

- Changed the "Open on CodeStream" button in posts to Slack / MS Teams to "Open on Web"
- Improvements on codemark location calulation

### Fixed

- Fixes an issue with editing replies
- Fixes an issue with the dropdowns for Author and Branch on the Search tab not working
- Fixes an issue with the formatting of code blocks in issues created on YouTrack
- Fixes an issue where the "Open in IDE" button, for codemarks with multiple locations, would always open to the first location
- Fixes issues with "Open in IDE" from codemark pages in Firefox

## [5.0.1] - 2019-10-18

### Fixed

- Fixes an issue with codemarks disappearing after a commit

## [5.0.0] - 2019-10-16

### Added

- Add the ability to have multiple blocks of code, even across files/repos, associated with a single codemark
- Adds the ability to create issues on GitLab Self-Managed

### Changed

- Codemarks can now be created and shared with your teammates even if you have unpushed commits
- Archived codemarks and resolved issues are now both controlled by the Archived filter on the Current File tab

### Fixed

- Fixes an issue where assignee wasn't being set correctly for issues created on GitLab
- Fixes an issue with the Asana integration where tasks weren't getting created

## [4.0.1] - 2019-10-2

### Added

- Adds the ability to filter codemarks on the Search tab by author, branch or commit

### Fixed

- Fixes an issue with changing issue-tracking services via the dropdown on the codemark form

## [4.0.0] - 2019-10-1

### Added

- Comments on merged-in pull requests from either GitHub or Bitbucket are now displayed right alongside the code blocks they refer to
- The ability to inject a codemark as an inline comment now has an option to include replies

### Fixed

- Fixes an issue where an issue codemark with a blank description would not get posted to Slack
- Fixes an issue where automated closed/opened messages for issue codemarks were not getting posted to Slack
- Fixes the sort order of Jira projects so that they are in alphabetical order
- Fixes an issue where the ability to star a reply was missing for Slack-connected teams
- Fixes an issue where Slack desktop notifications for codemarks would not include any content

## [3.0.2] - 2019-9-23

### Fixed

- Fixes an issue with files being opened in the CodeStream pane instead the last active editor group

## [3.0.1] - 2019-9-20

### Added

- Adds options to codemarks shared on Microsoft Teams to open a codemark on the web, in your IDE or, in the case of issues, on the issue-tracking service
- Adds new tophat to display of codemarks when the referenced code has been deleted

### Changed

- The bookmark codemark type has been removed, to be brought back at a future date

### Fixed

- Fixes [#120](]https://github.com/TeamCodeStream/CodeStream/issues/120) &mdash; CodeStream view continues to open up (required the removal of the CodeStream entry in the VS Code activity bar)
- Fixes [#117](]https://github.com/TeamCodeStream/CodeStream/issues/117) &mdash; Deleting codemark from Search tab causes unexpected error
- Fixes [#116](]https://github.com/TeamCodeStream/CodeStream/issues/116) &mdash; Creating codemark takes you out of List view
- Fixes [#115](]https://github.com/TeamCodeStream/CodeStream/issues/115) &mdash; Tab then enter discards codemark
- Fixes an issue with incorrect range being selected when code highlighted from the bottom up, and context menu used to create codemark
- Fixes an issue with permalinks being displayed on the Search tab

## [3.0.0] - 2019-9-17

### Added

- Adds a "Copy link" menu option for all codemarks so that they can be shared anywhere at any time
- Adds new web-based codemark pages to display codemarks shared via link
- Adds options to codemarks shared on Slack to open a codemark on the web, in your IDE or, in the case of issues, on the issue-tracking service
- When opening a codemark in your IDE from Slack or the web, if you don't happen to have the given repo open, CodeStream will still open the file for you automatically if you've ever opened that repo while signed into CodeStream. If not, we'll prompt you to open the repo, and we'll remember the location so you don't have to do that again.
- Adds a team switcher under the ellipses menu to switch between all of your CodeStream teams
- For on-prem installations, adds a check to make sure that the version of the API server running is compatible with the extension

### Fixed

- Fixes a rate limiting issue experienced by certain teams authenticating with Microsoft Teams
- Fixes an issue with deleting replies to a codemark
- Fixes an issue with syncing with YouTrack after authenticating
- Fixes an issue where a codemark created against unsaved code would not appear immediately
- Fixes [#110](]https://github.com/TeamCodeStream/CodeStream/issues/110) &mdash; When CodeStream is open in a split focusing on CodeStream can sometimes lose the last editor context
- Fixes [#109](]https://github.com/TeamCodeStream/CodeStream/issues/109) &mdash; When the same file is open in multiple editors clicking a comment navigates in wrong editor

## [2.1.3] - 2019-9-10

### Fixed

- Fixes [#102](]https://github.com/TeamCodeStream/CodeStream/issues/102) &mdash; Unable to prevent auto-opening of the CodeStream pane

## [2.1.2] - 2019-9-9

### Added

- Addresses [#79](]https://github.com/TeamCodeStream/CodeStream/issues/79) &mdash; Adds branch info to codemark display when there's a diff
- Adds the ability to inject a codemark as an inline comment

### Fixed

- Fixes a rate limiting issue experienced by certain teams authenticating with Microsoft Teams
- Fixes an issue where replies to a codemark in a Slack-connected team would briefly appear twice
- Fixes an issue where there was no confirmation message when adding a user to a channel via slash command
- Fixes an issue where signing out of a Slack-connected team wouldn't persist after a reload of the IDE
- Fixes an issue where deleting the last codemark in a file would not remove its marker decorator

## [2.1.0] - 2019-8-20

### Added

- Adds more robust tagging functionality, allowing you to create tags with any color / text label combination
- Adds the ability to link parts of your codebase by adding "related" codemarks to a parent codemark, and then using the links to jump around the codebases

### Changed

- Improved display of collapsed codemarks to make it easy to see tags, assignees, linked issues (i.e., on an external service like Jira), and the presence of replies or related codemarks
- All new cleaner display of expanded codemarks, with replies now displayed in descending order (i.e., most recent first)
- Consistent display of codemarks across all areas of CodeStream
- Smoother scrolling of codemarks in the CodeStream pane

### Fixed

- Fixes an issue with the positioning of the codemark form when creating a codemark at the bottom of the viewport
- Fixes an issue with not being able to change issue-tracking selection once Azure DevOps has been selected
- Fixes an issue with password reset in CodeStream on-prem

## [2.0.0] - 2019-8-1

### Added

- Adds issue-tracking integrations with Jira Server and GitHub Enterprise

### Changed

- Updates the UI for creating issues on external issue tracking services to allow you to be connected to multiple services at once and change the selection on an issue by issue basis
- Codemarks now appear immediately upon submission
- Trailing slashes are stripped off of the Server URL setting for on-prem installations

### Fixed

- Fixes an issue with not all DMs from Slack appearing in the conversation selector when creating a codemark
- Fixes an issue with a lack of notification when viewing a codemark in a file you don't have

## [1.3.4] - 2019-7-26

### Added

- Adds roadblocks when your extension is behind either a required or suggested version of CodeStream

### Fixed

- Fixes [#71](]https://github.com/TeamCodeStream/CodeStream/issues/71) &mdash; You can edit channel selection when editing via thread view
- Fixes an issue where you weren't being completely truly signed in, as evidenced by the VS Code status bar

## [1.3.2] - 2019-7-16

### Changed

- Added a "Back" link below the password-reset form in case you change your mind

### Fixed

- Fixes [#70](]https://github.com/TeamCodeStream/CodeStream/issues/70) &mdash; Once joined more than one channel, I can't choose into which channel a comment should go to anymore
- Fixes an issue with repos managed by Bitbucket Server incorrectly being identified as being managed by Bitbucket cloud
- Fixes scrolling issues when creating and viewing longer codemarks
- Fixes an issue where a reload/restart of VS Code would result in multiple CodeStream panes
- Fixes an issue with the legibility of button text in light themes

## [1.3.1] - 2019-7-10

### Added

- Password reset. Sorry it took so long!
- Enforcement of CodeStream's 30-day free trial, and 5-member limit for teams on the free plan

### Changed

- Optimizations to ipc between our processes and plugin startup

### Fixed

- Fixes an issue where scrolling in the CodeStream pane with the compose modal open would lose any information already entered
- Fixes an issue where a codemark could get posted as a reply to another codemark if you had thread view open
- Fixes a spacing issue on the Sign In page
- Fixes an issue with new UI not being applied to email confirmation and Team Name pages
- Fixes rendering issues with certain Slack bots when using Slack real-time channels

## [1.3.0] - 2019-6-26

### Added

- New Microsoft Teams integration allows you to share codemarks in your organization's existing channels. [Learn more.](https://www.codestream.com/blog/codestream-1-3)
- New Slack integration that reduces the amount of Slack that appears in CodeStream, with the full Channels tab now being optional

### Changed

- Updated the UI of CodeStream's signup flow
- Asana projects are now listed in alphabetical order for selection

### Fixed

- Fixed an issue that would create more than one "CodeStream (Agent)" output channel
- Fixes an issue with code blocks in Trello cards not rendering properly, and not including the line numbers

## [1.2.1] - 2019-6-17

### Fixed

- Fixes an issue where the activity bar icon is sized incorrectly

## [1.2.0] - 2019-6-14

### Changed

- The Invite People page now only shows teammates from your Slack workspace that have signed up for CodeStream

### Fixed

- Fixes an issue that would cause an error when opening a Slack channel with Japanese characters in the name
- Fixes an issue where hovering over an expanded codemark wouldn't highlight the corresponding code block in the editor
- Fixes an issue with text in backticks not rendering properly
- Fixes an issue with new lines being displayed as html in posts on Slack
- Fixes an issue with new lines in codemark text causing display issues on the Search tab
- Fixes an issue with the Asana integration that was preventing projects from being listed
- Fixes an issue with invitation codes incorrectly expiring after 10 minutes
- Fixes an issue with editing a reply from a codemark's thread view

## [1.1.0] - 2019-6-4

### Changed

- Signup flow is now based in the IDE instead of on the web
- For CodeStream teams, invitations are now code-based allowing for quicker signup
- For Slack teams, invitation URLs have been simplified

### Fixed

- Fixes [#60](]https://github.com/TeamCodeStream/CodeStream/issues/60) &mdash; can't delete codemark in vscode
- Fixes [#57](https://github.com/TeamCodeStream/CodeStream/issues/57) &mdash; Cygwin git support
- Fixes an issue with bookmark titles not being displayed on Slack
- Fixes an issue with code snippets added to a codemark via markdown not rendering

## [1.0.2] - 2019-5-22

### Changed

- Desktop notifications now default to off for users on Slack teams

### Fixed

- Fixes an issue where a new codemark sometimes wouldn't appear right away
- Fixes an issue where git repos with remote URLs containing port numbers would prevent codemarks from being displayed properly
- Fixes [#61](https://github.com/TeamCodeStream/CodeStream/issues/61) &mdash; Formatting issues with codemarks

## [1.0.1] - 2019-5-15

### Added

- Adds an integration with YouTrack issue tracking

## [1.0.0] - 2019-5-13

### Added

- Adds preemptive warnings about creating codemarks in files that aren't managed by Git, don't have remote URLs, or haven't been saved

### Fixed

- Fixes an issue with the wrapping of filename and line number information in the codemark form

## [0.53.0] - 2019-5-3

### Added

- CodeStream now integrates with Azure DevOps issue tracking

### Changed

- When editing an issue codemark linked to an external service, assignees are read-only since they can't be edited from CodeStream

### Fixed

- Fixes an issue with mentions posted in a reply not being treated as a mention in terms of badges and notifications
- Fixes an issue with notifications on Slack teams not working
- Fixes an issue where CodeStream would not recognize when a source file wasn't selected or open
- Fixes an issue when changing the code selection with the codemark form already open
- Fixes an issue with editing posts from the conversation stream

## [0.52.1] - 2019-4-19

### Added

- Adds a guide to keyboard shortcuts in the default view of the Current File tab when there are no codemarks

### Changed

- Updated the Jira integration to accommodate the GDPR-related changes to the Jira Cloud REST APIs, which means that Jira assignees can no longer be mapped to a CodeStream user

### Fixed

- Fixes an issue that prevented desktop notifications from being displayed
- Fixes an issue that prevented users with proxies from being able to sign in
- Fixes an issue that prevented users without Git installed from being able to sign in
- Fixes an issue that prevented the editing of replies

## [0.52.0] - 2019-4-10

### Added

- Adds a completely new view of codemarks that makes information much more accessible, with the ability to view and edit in-place. [Read more on our blog.](https://blog.codestream.com/index.php/2019/04/10/codestream-v0-52-new-codemarks-view/)
- Adds the ability to "star" a reply so that it's surfaced in the codemarks view
- Adds the ability to assign shortcuts to individual codemarks, allowing you to quickly jump around the codebase
- Adds a toolbar to the bottom of the Current File tab with filters to control whether or not you see completed issues or archived codemarks
- Adds clickable indicators to the toolbar to let you know when there are codemarks above/below your current view
- Archived codemarks and resolved issues are now displayed in a collapsed format in a new gutter at the right side of the CodeStream pane, with the ability to click to expand the display
- Adds a new header treatment for archived codemarks
- Scrolling the view of codemarks in the CodeStream pane will now scroll the source file as well
- Adds a quick overview of codemarks accessible via an info icon at the bottom-right of each codemark

### Changed

- The display of an expanded codemark only includes the code block, as well as the Compare and Apply links, if there’s a diff from what you have locally

### Fixed

- Fixes an issue where using the “selected conversations” filter on the Channels tab, with only a single channel selected, would cause codemarks to get shared to the wrong conversation
- Fixes an issue where a codemark would no longer render on CodeStream if the post was deleted via the Slack client
- Fixes an issue where archived and closed Slack conversations were appearing in the conversation selector when creating a codemark
- Fixes an issue that prevented an edited bookmark from being saved

## [0.51.0] - 2019-4-2

### Changed

- Changes the `Ctrl+/` `Ctrl+/` shortcut to toggle the CodeStream pane
- Improves the Jira project search to ensure all projects are available for selection

## [0.50.0] - 2019-3-21

### Added

- Adds a Google Docs-like display of codemarks in the current file, where codemarks are displayed to the right of the source code and scroll up/down along with the source
- Adds a permalink codemark type for sharing a link to a specific block of code
- Adds the ability to close or re-open an issue from the codemark's thread view
- Adds an Archive option to a codemark’s gear menu to hide it when the Current File tab is selected (but it will still be shown on the Search tab)
- Adds new [keyboard shortcuts](https://github.com/TeamCodeStream/CodeStream/wiki/Keyboard-Shortcuts) for creating a codemark after selecting code
- Adds a `codestream.autoHideMarkers` setting (on by default) to specify whether to automatically hide editor marker glyphs when the CodeStream panel is showing codemarks in the current file
- Adds a `codestream.showMarkerCodeLens` setting (off by default) to specify whether to show code lens above lines with associated codemarks in the editor
- Adds a `codestream.showFeedbackSmiley` setting (on by default) to specify whether to show a feedback button in the CodeStream panel
- Adds an experimental `codestream.showShortcutTipOnSelection` setting (off by default) to specify whether to show a shortcut key tip attached to the selection when you select code (still a work in progress)

### Changed

- Opening the CodeStream pane is now much faster
- New icon-based global navigation
- When selecting a channel/DM to share a codemark, the list now honors the “selected conversations” filter from the Channels tab
- Context/lightbulb menus in the editor now have separate entries for creating a comment, issue, bookmark or permalink
- Renames `codestream.showMarkers` setting to `codestream.showMarkerGlyphs` as it is now specifically about glyph indicators
- Renames `codestream.avatars` setting to `codestream.showAvatars` for consistency with other settings

### Fixed

- Fixes an issue with the wrong channel name being displayed at the top of the page when viewing a codemark
- Fixes an issue with links to join a Live Share session not being clickable
- Fixes an issue with “/cc” being include in codemarks shared on Slack when no one was mentioned

## [0.35.0] - 2019-2-15

### Fixed

- Fixes an issue where the Submit/Cancel buttons would not render correctly when creating a codemark

## [0.34.0] - 2019-2-8

### Changed

- Mentions in a codemark posted to Slack are now replicated outside of the attachment so that they render as actual mentions on Slack

### Fixed

- Fixes an issue where messages weren't being rendered in realtime
- Fixes [#34](https://github.com/TeamCodeStream/CodeStream/issues/34) &mdash; Slack channel list not fully visible when creating CodeMark
- Fixes an issue with the mentions popup not being fully scrollable
- Fixes an issue with mentions not being case insensitive

## [0.33.1] - 2019-2-5

### Fixed

- Fixes an issue that required a second auth with Slack after signing up with Slack

## [0.33.0] - 2019-2-4

### Added

- Adds issue integrations with Jira, Trello, GitHub, Asana, Bitbucket, and GitLab
- Adds the ability to compare the code associated with a codemark to your local version of the file, or to apply the change
- Adds a More Options/ellipses menu to the global nav for access to inviting people, help, sign out, and the ability to connect/disconnect from external services
- Adds an entry into the VS Code activity bar that toggles the CodeStream pane

### Changed

- New, simplified form for creating a codemark
- Hovering over a codemark in a source file now automatically displays the codemark in the CodeStream pane

### Fixed

- Fixes an issue with emoji not rendering in a codemark's hover
- Fixes an issue with Selected Conversations filter selections not persisting

## [0.32.0] - 2019-1-7

### Fixed

- Fixes an issue with unread message indicators not clearing for CodeStream teams when there were unreads in multiple channels

## [0.31.0] - 2018-12-20

### Changed

- Replies posted to a thread are no longer broadcast to the channel on Slack to temporarily work around a Slack bug
- Link text when hovering over a codemark in a source file is now based on the type of codemark

### Fixed

- Fixes an issue where very long strings would expand the New Codemark modal off the page
- Fixes an issue with the help text in the chat box when viewing a thread
- Fixes an issue with line breaks not being preserved in codemark descriptions
- Fixes an issue with the Codemarks tab not taking repo into account when associating codemarks with the current file
- Fixes an issue with the webview not always restoring the previously selected channel

## [0.30.3] - 2018-12-12

### Fixed

- Fixes [#28](https://github.com/TeamCodeStream/CodeStream/issues/28) &mdash; Certain markdown snippets cause markdown parsing library to throw an error

## [0.30.2] - 2018-12-10

### Fixed

- Fixes [#20](https://github.com/TeamCodeStream/CodeStream/issues/20) &mdash; Add CodeStream comment doesn't work for Slack
- Fixes an issue with automated messages for the closing of an issue codemark not being displayed as part of the issue's thread.

## [0.30.1] - 2018-12-6

### Fixed

- Fixes an issue where if another user created a codemark (without code), it would not immediately be displayed in the Codemarks view
- Fixes an issue where if another user created a codemark (with code), it would not be displayed in the editor until a reload

## [0.30] - 2018-12-6

### Added

- Adds different types of "codemarks", including comments, issues, code traps and bookmarks, for annotating your code base - [Learn more about codemarks](https://github.com/TeamCodeStream/CodeStream/wiki/Building-a-Knowledge-Base-with-Codemarks)
- Adds a "Codemarks" page for exploring your knowledge base and looking at filtered views of your codemarks
- Adds a global navigation with tabs for jumping between codemarks, channels and your currently selected conversation
- Adds the ability to search for codemarks
- Adds a form for creating codemarks that automatically pops up when code is selected in your editor
- Adds a "Quote" option to the gear menu for posts in the stream to easily quote a post
- Adds the ability to start a Live Share session via an icon that appears on hover on the Channels tab

### Changed

- Continued (but significant) optimizations for handling large slack workspaces

### Fixed

- Fixes [#10](https://github.com/TeamCodeStream/CodeStream/issues/10) &mdash; Downloading Channel list takes a very long time, then fails
- Fixes [#15](https://github.com/TeamCodeStream/CodeStream/issues/15) &mdash; Unable to open channels with Japanese characters
- Fixes [#17](https://github.com/TeamCodeStream/CodeStream/issues/17) &mdash; Links to Github don't put hash in URL properly
- Fixes [#18](https://github.com/TeamCodeStream/CodeStream/issues/18) &mdash; Unread count in VS Code status bar not decrementing

## [0.24.2] - 2018-11-19

### Fixed

- Fixes issue with some slack teams missing real-time events -- affected teams will be signed out and will need to reauthenticate to resolve the issue

## [0.24.1] - 2018-11-16

### Fixed

- Fixes some performance issues with larger Slack teams (still a work-in-progress)

## [0.24.0] - 2018-11-12

### Added

- Adds an Open button to incoming message notifications to jump directly to the channel &mdash; closes [#8](https://github.com/TeamCodeStream/CodeStream/issues/8)

### Changed

- Improves reconnection status and behavior on network connection loss or sleep for Slack teams

### Fixed

- Fixes an issue where unread indicators were not showing up on channels after logging in with Slack teams
- Fixes an issue where unread indicators were sometimes showing up for archived channels with Slack teams
- Fixes an issue where in certain (rare) cases the agent process could get stuck in an infinite loop

## [0.23.0] - 2018-11-9

### Changed

- Improves performance of initial loading of channels/DMs for Slack teams

## [0.22.1] - 2018-11-7

### Fixed

- Fixes an undefined property error while calculating count of unread messages

## [0.22.0] - 2018-11-2

### Fixed

- Fixes an issue with logging into some Slack teams
- Fixes issues with reconnecting to Slack after a network connection loss
- Fixes an issue where channels deleted from Slack wouldn't get removed from CodeStream

## [0.21.0] - 2018-11-1

### Added

- Adds support for network connections via proxies
- Adds the ability to add people to or remove people from a Slack channel via CodeStream
- Adds the synchronization of a channel's muted status from Slack

### Changed

- Prioritize Slack DMs to reduce the number that need to be loaded

### Fixed

- Fixes an issue with leaving a Slack channel from within CodeStream
- Fixes an issue with adding people while creating a Slack channel from CodeStream
- Fixes an issue where creating a Slack DM could result in an unexpected error
- Fixes an issue with marking a stream as read
- Fixes [#12](https://github.com/TeamCodeStream/CodeStream/issues/12) &mdash; Webview: FAILED waiting for webview ready event
- Fixes an issue with CodeStream's ephemeral system posts sometimes causing errors

## [0.20.0] - 2018-10-29

### Added

- Adds the display of Slack-based presence next to DMs on the channel switcher
- Adds the synchronization of closed DMs between Slack and CodeStream

### Changed

- Optimizes startup performance to avoid rate-limiting and slow foreground requests due to background fetching when using Slack channels

## [0.19.0] - 2018-10-26

### Added

- Adds ability to archive a Slack channel via the /archive slash command
- Adds ability to rename a Slack channel via the /rename slash command
- Adds ability to set the purpose of a Slack channel via the /purpose slash command
- Adds /msg command for Slack channels

### Changed

- Reduced our default post fetch count to 50 for better performance

### Fixed

- Fixes an issue with the /msg slash command adding extra spaces in the message
- Fixes an issue with seeing replies in some case with CodeStream channels
- Fixes issues where in certain cases marker recalculation failed

## [0.18.0] - 2018-10-24

### Changed

- Decouple the loading of Slack channels from the loading of unread and latest-post information.

### Fixed

- Fixes an issue with new direct messages not appearing on the channel switcher without a reload.
- Fixes an issue with deactivated users appearing in list of DMs and in list of current team members.
- Fixes an issue where code block wasn't being highlighted in source file when entering thread view.
- Fixes an issue that prevented the deletion of multiple posts.
- Fixes an issue with adding and removing people from CodeStream channels.
- Fixes an issue with renaming or setting the purpose of a CodeStream channel.
- Fixes an issue with being able to react to a message multiple times with the same emoji.

## [0.17.1] - 2018-10-17

### Fixed

- Fixes an issue with markers not working

## [0.17.0] - 2018-10-17

### Fixed

- Fixes [#6](https://github.com/TeamCodeStream/CodeStream/issues/6) &mdash; Github Links in Slack messages are broken
- Fixes an unexpected error when creating a new direct messages
- Fixes an issue that would incorrectly redisplay the "unread messages above" banner
- Fixes an issue that prevented the display of the new-message separator in the stream

## [0.16.0] - 2018-10-15

### Fixed

- Fixes syncronization of unread message indicators between CodeStream and Slack.
- Fixes issues with certain message content that would trigger unexpected errors.

## [0.15.1] - 2018-10-11

### Fixed

- Fixes [#5](https://github.com/TeamCodeStream/CodeStream/issues/3) &mdash; Clicking Slack emoji icon produces an unexpected error

## [0.15.0] - 2018-10-10

### Added

- Adds the ability to access all of your Slack channels and DMs from within CodeStream. [Learn more.](https://blog.codestream.com/index.php/2018/10/10/codestream-brings-slack-into-vs-code/)

## Fixed

- Fixes possible incorrect team selection when signing into a Slack team
- Fixes missing Slack thread replies from showing up in the channel

## [0.13.0] - 2018-09-27

### Added

- Adds display of channel purpose in tooltip when you hover over channel name in stream header.
- Adds Back button to the header of the New Channel page.
- Adds emoji name to the tooltip when you hover over a reaction.

### Changed

- Changes UI of the channel switcher to more closely mirror the VS Code sidebar.
- Changes `codestream.showInStatusBar` setting to allow CodeStream to be shown at either the left or right side of the status bar.

## Fixed

- Fixes [#3](https://github.com/TeamCodeStream/CodeStream/issues/3) &mdash; Logging to debug console when debugging different extension

## [0.12.0] - 2018-09-19

### Added

- Adds a new `codestream.showInStatusBar` setting to specify whether to show CodeStream in the status bar &mdash; closes [#1](https://github.com/TeamCodeStream/CodeStream/issues/1)

## [0.11.0] - 2018-09-11

### Added

- Initial beta release for the VS Code Marketplace.
- Adds support for emoji selection and auto-completion.
- Adds ability to add reactions to messages.
- Adds support for the use of markdown in messages.
- Adds display of CodeStream version number to bottom of sign-in page.

### Changed

- Increases security by storing credentials in the native credential store if available.
- Reduces package size and improves loading performance.
- Notifies users of required extension updates, but otherwise now lets VS Code handle regular updates.

### Fixed

- Fixes issue with new channel members not always seeing complete message history without reload of webview.
