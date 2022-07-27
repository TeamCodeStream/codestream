using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Annotations;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Models {
	public static class EditorStateExtensions {
		public static List<EditorSelection> ToEditorSelectionsSafe(this EditorState editorState) {
			if (editorState == null) return null;

			return new List<EditorSelection> {
				new EditorSelection(editorState.Cursor, editorState.Range)
			};
		}
	}

	/// <summary>
	/// Wraps various editor properties that represent its current state
	/// </summary>
	public class EditorState {
		public EditorState(Range range, Position cursor, string selectedText) {
			Range = range;
			Cursor = cursor;
			SelectedText = selectedText;
		}

		public Range Range { get; }
		public Position Cursor { get; }
		public string SelectedText { get; }
		public bool HasSelectedText => !SelectedText.IsNullOrWhiteSpace();
	}

	/// <summary>
	/// While this might extend Range in VSCode, an issue in serialization makes that hard.
	/// Instead, we add a Start & End to this object
	/// </summary>
	public class EditorSelection {
		[JsonConstructor]
		public EditorSelection(Position cursor, Position start, Position end) : this(cursor, new Range { Start = start, End = end }) { }

		public EditorSelection(Position cursor, Range range) {
			Cursor = cursor;
			if (range == null) {
				Start = new Position(0, 0);
				End = new Position(0, 0); ;
			}
			else {
				Start = range.Start;
				End = range.End;
			}
		}

		public Position Start { get; }
		public Position End { get; }
		public Position Cursor { get; }

		public Range ToRange() => new Range() { Start = Start, End = End };
	}

	public static class EditorSelectionExtensions {
		public static Range ToRange(this EditorSelection selection) => selection != null ? selection.ToRange() : null;
	}

	public class CsEntity {
		private long _createdAt;
		private long _modifiedAt;

		[JsonProperty("deactivated", NullValueHandling = NullValueHandling.Ignore)]
		public bool Deactivated { get; set; }

		[JsonProperty("createdAt", NullValueHandling = NullValueHandling.Ignore)]
		public long CreatedAt {
			get => _createdAt;
			set {
				_createdAt = value;
				CreateAtDateTime = value.FromLong().ToLocalTime();
			}
		}

		public DateTime CreateAtDateTime { get; private set; }

		[JsonProperty("modifiedAt", NullValueHandling = NullValueHandling.Ignore)]
		public long ModifiedAt {
			get => _modifiedAt;
			set {
				_modifiedAt = value;
				ModifiedAtDateTime = value.FromLong().ToLocalTime();
			}
		}

		public DateTime ModifiedAtDateTime { get; private set; }

		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }
		// ReSharper disable once InconsistentNaming
		[JsonProperty("_id", NullValueHandling = NullValueHandling.Ignore)]
		public string _Id { get; set; }
		[JsonProperty("creatorId", NullValueHandling = NullValueHandling.Ignore)]
		public string CreatorId { get; set; }
		[JsonProperty("version", NullValueHandling = NullValueHandling.Ignore)]
		public int Version { get; set; }
	}

	public class File {
		[JsonProperty("mimetype", NullValueHandling = NullValueHandling.Ignore)]
		public string Mimetype { get; set; }
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("title", NullValueHandling = NullValueHandling.Ignore)]
		public string Title { get; set; }
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public string Type { get; set; }
		[JsonProperty("url", NullValueHandling = NullValueHandling.Ignore)]
		public string Url { get; set; }
		//NOTE this is some kind string | object
		[JsonProperty("preview", NullValueHandling = NullValueHandling.Ignore)]
		public object Preview { get; set; }
	}

	public class CsPost : CsEntity {
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("parentPostId", NullValueHandling = NullValueHandling.Ignore)]
		public string ParentPostId { get; set; }
		[JsonProperty("numReplies", NullValueHandling = NullValueHandling.Ignore)]
		public int NumReplies { get; set; }
		[JsonProperty("text", NullValueHandling = NullValueHandling.Ignore)]
		public string Text { get; set; }
		[JsonProperty("seqNum", NullValueHandling = NullValueHandling.Ignore)]
		public object SeqNum { get; set; }
		[JsonProperty("hasBeenEdited", NullValueHandling = NullValueHandling.Ignore)]
		public bool HasBeenEdited { get; set; }
		[JsonProperty("mentionedUserIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> MentionedUserIds { get; set; }
		[JsonProperty("origin", NullValueHandling = NullValueHandling.Ignore)]
		public string Origin { get; set; } //?: "email" | "slack" | "teams";
		[JsonProperty("reactions", NullValueHandling = NullValueHandling.Ignore)]
		public Dictionary<string, List<string>> Reactions { get; set; }
		[JsonProperty("codemarkId", NullValueHandling = NullValueHandling.Ignore)]
		public string CodemarkId { get; set; }
		[JsonProperty("files", NullValueHandling = NullValueHandling.Ignore)]
		public List<File> Files { get; set; }
	}

	public class CsFullPost : CsPost {
		[JsonProperty("codemark", NullValueHandling = NullValueHandling.Ignore)]
		public CsFullCodemark Codemark { get; set; }
		[JsonProperty("hasMarkers", NullValueHandling = NullValueHandling.Ignore)]
		public bool? HasMarkers { get; set; }
	}

	public interface ICSMarkerIdentifier {
		string Id { get; set; }
		string File { get; set; }
		string RepoId { get; set; }
	}

	public class CSMarkerIdentifier : ICSMarkerIdentifier {
		public string Id { get; set; }
		public string File { get; set; }
		public string RepoId { get; set; }
	}

	public class CsMarker : CsEntity, ICSMarkerIdentifier {
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("fileStreamId", NullValueHandling = NullValueHandling.Ignore)]
		public string FileStreamId { get; set; }
		[JsonProperty("postStreamId", NullValueHandling = NullValueHandling.Ignore)]
		public string PostStreamId { get; set; }
		[JsonProperty("postId", NullValueHandling = NullValueHandling.Ignore)]
		public string PostId { get; set; }
		[JsonProperty("codemarkId", NullValueHandling = NullValueHandling.Ignore)]
		public string CodemarkId { get; set; }
		[JsonProperty("providerType", NullValueHandling = NullValueHandling.Ignore)]
		public ProviderType? ProviderType { get; set; }
		[JsonProperty("commitHashWhenCreated", NullValueHandling = NullValueHandling.Ignore)]
		public string CommitHashWhenCreated { get; set; }
		/// <summary>
		/// this is // export type CSLocationArray = [number, number, number, number, CSLocationMeta | undefined];
		/// </summary>
		[JsonProperty("locationWhenCreated", NullValueHandling = NullValueHandling.Ignore)]
		public List<object> LocationWhenCreated { get; set; }
		[JsonProperty("code", NullValueHandling = NullValueHandling.Ignore)]
		public string Code { get; set; }
		[JsonProperty("file", NullValueHandling = NullValueHandling.Ignore)]
		public string File { get; set; }
		[JsonProperty("repo", NullValueHandling = NullValueHandling.Ignore)]
		public string Repo { get; set; }
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }
	}

	public class MarkerNotLocated : CsMarker {
		public string NotLocatedReason { get; set; }//: MarkerNotLocatedReason;
		public string NotLocatedDetails { get; set; }
	}

	public class CsMarkerLocations {
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("commitHash", NullValueHandling = NullValueHandling.Ignore)]
		public string CommitHash { get; set; }
		//NOTE this is a bizarro shaped object
		[JsonProperty("locations", NullValueHandling = NullValueHandling.Ignore)]
		public Dictionary<string, List<object>> Locations { get; set; }
	}

	public class CsCodemark : CsEntity {
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("postId", NullValueHandling = NullValueHandling.Ignore)]
		public string PostId { get; set; }
		[JsonProperty("parentPostId", NullValueHandling = NullValueHandling.Ignore)]
		public string ParentPostId { get; set; }
		[JsonProperty("markerIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> MarkerIds { get; set; }
		[JsonProperty("fileStreamIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> FileStreamIds { get; set; }
		[JsonProperty("providerType", NullValueHandling = NullValueHandling.Ignore)]
		public ProviderType? ProviderType { get; set; }
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public CodemarkType Type { get; set; }
		[JsonProperty("status", NullValueHandling = NullValueHandling.Ignore)]
		public string Status { get; set; }
		[JsonProperty("title", NullValueHandling = NullValueHandling.Ignore)]
		public string Title { get; set; }
		[JsonProperty("assignees", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> Assignees { get; set; }
		[JsonProperty("text", NullValueHandling = NullValueHandling.Ignore)]
		public string Text { get; set; }
		[JsonProperty("numReplies", NullValueHandling = NullValueHandling.Ignore)]
		public int NumReplies { get; set; }
		[JsonProperty("pinned", NullValueHandling = NullValueHandling.Ignore)]
		public bool Pinned { get; set; }
		[JsonProperty("pinnedReplies", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> PinnedReplies { get; set; }
		[JsonProperty("externalAssignees", NullValueHandling = NullValueHandling.Ignore)]
		public List<ExternalAssignee> ExternalAssignees { get; set; }
		[JsonProperty("externalProvider", NullValueHandling = NullValueHandling.Ignore)]
		public string ExternalProvider { get; set; }
		[JsonProperty("externalProviderHost", NullValueHandling = NullValueHandling.Ignore)]
		public string ExternalProviderHost { get; set; }
		[JsonProperty("externalProviderUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string ExternalProviderUrl { get; set; }
	}

	public class ExternalAssignee {
		[JsonProperty("displayName", NullValueHandling = NullValueHandling.Ignore)]
		public string DisplayName { get; set; }
		[JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
		public string Email { get; set; }
	}

	public class DocumentMarker : CsEntity, ICSMarkerIdentifier {
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("fileStreamId", NullValueHandling = NullValueHandling.Ignore)]
		public string FileStreamId { get; set; }
		[JsonProperty("codemarkId", NullValueHandling = NullValueHandling.Ignore)]
		public string CodemarkId { get; set; }
		[JsonProperty("code", NullValueHandling = NullValueHandling.Ignore)]
		public string Code { get; set; }
		[JsonIgnore]
		public string Color {
			get {
				// TODO: -- Use a setting?
				return !Pinned ? "gray" : Status == "closed" ? "purple" : "green";				
			}
		}
		[JsonProperty("creatorAvatar", NullValueHandling = NullValueHandling.Ignore)]
		public string CreatorAvatar { get; set; }
		[JsonProperty("creatorName", NullValueHandling = NullValueHandling.Ignore)]
		public string CreatorName { get; set; }
		[JsonProperty("commitHashWhenCreated", NullValueHandling = NullValueHandling.Ignore)]
		public string CommitHashWhenCreated { get; set; }
		[JsonProperty("codemark", NullValueHandling = NullValueHandling.Ignore)]
		public CsCodemark Codemark { get; set; }
		[JsonProperty("externalContent", NullValueHandling = NullValueHandling.Ignore)]
		public ExternalContent ExternalContent { get; set; }
		[JsonProperty("range", NullValueHandling = NullValueHandling.Ignore)]
		public Range Range { get; set; }
		[JsonIgnore]
		public bool Pinned {
			get {
				return Codemark?.Pinned == true;
			}
		}
		[JsonIgnore]
		public string Status {
			get {				
				return Codemark?.Status ?? "open";
			}
		}
		[JsonProperty("summary", NullValueHandling = NullValueHandling.Ignore)]
		public string Summary { get; set; }
		[JsonProperty("summaryMarkdown", NullValueHandling = NullValueHandling.Ignore)]
		public string SummaryMarkdown { get; set; }
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public CodemarkType Type { get; set; }
		[JsonProperty("file", NullValueHandling = NullValueHandling.Ignore)]
		public string File { get; set; }
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }
	}

	public class ExternalContent {
		[JsonProperty("provider", NullValueHandling = NullValueHandling.Ignore)]
		public ExternalContentProvider Provider { get; set; }
		[JsonProperty("subhead", NullValueHandling = NullValueHandling.Ignore)]
		public string Subhead { get; set; }
		[JsonProperty("actions", NullValueHandling = NullValueHandling.Ignore)]
		public List<ExternalContentActions> Actions { get; set; }
	}

	public class ExternalContentProvider {
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("icon", NullValueHandling = NullValueHandling.Ignore)]
		public string Icon { get; set; }
	}

	public class ExternalContentActions {
		[JsonProperty("label", NullValueHandling = NullValueHandling.Ignore)]
		public string Label { get; set; }
		[JsonProperty("icon", NullValueHandling = NullValueHandling.Ignore)]
		public string Icon { get; set; }
		[JsonProperty("uri", NullValueHandling = NullValueHandling.Ignore)]
		public string Uri { get; set; }
	}

	public class CsFullCodemark : CsMarker {
		[JsonProperty("markers", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsMarker> Markers { get; set; }
	}

	// TODO these stream objects are not nice

	public class CsStream : CsEntity {
		public CsStream() {
			MemberIds = new List<string>();
		}
		[JsonProperty("isArchived", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsArchived { get; set; }
		[JsonProperty("privacy", NullValueHandling = NullValueHandling.Ignore)]
		public string Privacy { get; set; }
		[JsonProperty("sortId", NullValueHandling = NullValueHandling.Ignore)]
		public string SortId { get; set; }
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("mostRecentPostCreatedAt", NullValueHandling = NullValueHandling.Ignore)]
		public long? MostRecentPostCreatedAt { get; set; }
		[JsonProperty("mostRecentPostId", NullValueHandling = NullValueHandling.Ignore)]
		public string MostRecentPostId { get; set; }
		[JsonProperty("purpose", NullValueHandling = NullValueHandling.Ignore)]
		public string Purpose { get; set; }
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public string Type { get; set; }
		[JsonProperty("file", NullValueHandling = NullValueHandling.Ignore)]
		public string File { get; set; }
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }
		[JsonProperty("numMarkers", NullValueHandling = NullValueHandling.Ignore)]
		public int NumMarkers { get; set; }
		[JsonProperty("editingUsers", NullValueHandling = NullValueHandling.Ignore)]
		public object EditingUsers { get; set; }

		//direct
		[JsonProperty("isClosed", NullValueHandling = NullValueHandling.Ignore)]
		public bool? IsClosed { get; set; }
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("memberIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> MemberIds { get; set; }
		[JsonProperty("priority", NullValueHandling = NullValueHandling.Ignore)]
		public int? Priority { get; set; }

		//channel stream
		[JsonProperty("isTeamStream", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsTeamStream { get; set; }
		[JsonProperty("serviceType", NullValueHandling = NullValueHandling.Ignore)]
		public string ServiceType { get; set; }
		[JsonProperty("serviceKey", NullValueHandling = NullValueHandling.Ignore)]
		public string ServiceKey { get; set; }
		[JsonProperty("serviceInfo", NullValueHandling = NullValueHandling.Ignore)]
		public Dictionary<string, object> ServiceInfo { get; set; }
	}

	public class CsDirectStream : CsStream {
	}

	public class CsFileStream : CsStream {

	}

	public class CsUser : CsEntity {
		[JsonProperty("companyIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> CompanyIds { get; set; }
		[JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
		public string Email { get; set; }
		[JsonProperty("firstName", NullValueHandling = NullValueHandling.Ignore)]
		public string FirstName { get; set; }
		[JsonProperty("fullName", NullValueHandling = NullValueHandling.Ignore)]
		public string FullName { get; set; }
		[JsonProperty("isRegistered", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsRegistered { get; set; }
		// ReSharper disable once InconsistentNaming
		[JsonProperty("iWorkOn", NullValueHandling = NullValueHandling.Ignore)]
		public string IWorkOn { get; set; }
		[JsonProperty("lastName", NullValueHandling = NullValueHandling.Ignore)]
		public string LastName { get; set; }
		[JsonProperty("lastPostCreatedAt", NullValueHandling = NullValueHandling.Ignore)]
		public long LastPostCreatedAt { get; set; }
		[JsonProperty("numMentions", NullValueHandling = NullValueHandling.Ignore)]
		public int NumMentions { get; set; }
		[JsonProperty("numInvites", NullValueHandling = NullValueHandling.Ignore)]
		public int NumInvites { get; set; }
		[JsonProperty("registeredAt", NullValueHandling = NullValueHandling.Ignore)]
		public long RegisteredAt { get; set; }
		[JsonProperty("secondaryEmails", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> SecondaryEmails { get; set; }
		[JsonProperty("teamIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> TeamIds { get; set; }
		[JsonProperty("timeZone", NullValueHandling = NullValueHandling.Ignore)]
		public string TimeZone { get; set; }
		[JsonProperty("totalPosts", NullValueHandling = NullValueHandling.Ignore)]
		public int TotalPosts { get; set; }
		[JsonProperty("username", NullValueHandling = NullValueHandling.Ignore)]
		public string Username { get; set; }
		[JsonProperty("dnd", NullValueHandling = NullValueHandling.Ignore)]
		public bool? Dnd { get; set; }
		[JsonProperty("presence", NullValueHandling = NullValueHandling.Ignore)]
		public string Presence { get; set; }

		[JsonIgnore]
		public string Name {
			get { return Username ?? FullName; }
		}
	}

	public class CsTeam {
		public string CompanyId { get; set; }
		public string Id { get; set; }
		public string Name { get; set; }
	}

	public class CsCompany : CsEntity {
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string CompanyName { get; set; }

		[JsonProperty("everyoneTeamId", NullValueHandling = NullValueHandling.Ignore)]
		public string EveryoneTeamId { get; set; }

		[JsonProperty("trialStartDate", NullValueHandling = NullValueHandling.Ignore)]
		public long? TrialStartDate { get; set; }

		[JsonProperty("trialEndDate", NullValueHandling = NullValueHandling.Ignore)]
		public long? TrialEndDate { get; set; }

		[JsonProperty("plan", NullValueHandling = NullValueHandling.Ignore)]
		public string Plan { get; set; }

		[JsonProperty("reportingGroup", NullValueHandling = NullValueHandling.Ignore)]
		public string ReportingGroup { get; set; }

		[JsonProperty("domainJoining", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> DomainJoining { get; set; }

		[JsonProperty("nrOrgIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> NROrgIds { get; set; }

		[JsonProperty("nrAccountIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> NRAccountIds { get; set; }

		[JsonProperty("isNRConnected", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsNRConnected{ get; set; }

		[JsonProperty("host", NullValueHandling = NullValueHandling.Ignore)]
		public EnvironmentHost EnvironmentHost{ get; set; }

		[JsonProperty("testGroups", NullValueHandling = NullValueHandling.Ignore)]
		public KeyValuePair<string, string> TestGroups{ get; set; }
	}

	public class CsRemote {
		[JsonProperty("url", NullValueHandling = NullValueHandling.Ignore)]
		public string Url { get; set; }
		[JsonProperty("normalizedUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string NormalizedUrl { get; set; }
		[JsonProperty("companyIdentifier", NullValueHandling = NullValueHandling.Ignore)]
		public string CompanyIdentifier { get; set; }
	}

	public class CsRepository {
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("remotes", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsRemote> Remotes { get; set; }
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
	}

	public class Extension {
		[JsonProperty("build", NullValueHandling = NullValueHandling.Ignore)]
		public string Build { get; set; }
		[JsonProperty("buildEnv", NullValueHandling = NullValueHandling.Ignore)]
		public string BuildEnv { get; set; }
		[JsonProperty("version", NullValueHandling = NullValueHandling.Ignore)]
		public string Version { get; set; }
		[JsonProperty("versionFormatted", NullValueHandling = NullValueHandling.Ignore)]
		public string VersionFormatted { get; set; }
	}

	public class Ide {
		[NotNull]
		[JsonProperty("name")]
		public string Name { get; set; }

		[JsonProperty("version", NullValueHandling = NullValueHandling.Ignore)]
		public string Version { get; set; }

		[NotNull]
		[JsonProperty("detail")]
		public string Detail { get; set; }
	}

	public class Proxy {
		[JsonProperty("url", NullValueHandling = NullValueHandling.Ignore)]
		public string Url { get; set; }
		[JsonProperty("strictSSL", NullValueHandling = NullValueHandling.Ignore)]
		public bool StrictSSL { get; set; }
	}

	[JsonConverter(typeof(StringEnumConverter))]
	public enum ProxySupport {
		On,
		Off
	}

	public class InitializationOptions {
		[JsonProperty("serverUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string ServerUrl { get; set; }
		[JsonProperty("ide", NullValueHandling = NullValueHandling.Ignore)]
		public Ide Ide { get; set; }
		[JsonProperty("extension", NullValueHandling = NullValueHandling.Ignore)]
		public Extension Extension { get; set; }
		[JsonProperty("traceLevel", NullValueHandling = NullValueHandling.Ignore)]
		public string TraceLevel { get; set; }
		[JsonProperty("isDebugging", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsDebugging { get; set; }
		[JsonProperty("proxySupport", NullValueHandling = NullValueHandling.Ignore)]
		public string ProxySupport { get; set; }
		[JsonProperty("proxy", NullValueHandling = NullValueHandling.Ignore)]
		public Proxy Proxy { get; set; }
		[JsonProperty("disableStrictSSL", NullValueHandling = NullValueHandling.Ignore)]
		public bool DisableStrictSSL { get; set; }
		[JsonProperty("newRelicTelemetryEnabled", NullValueHandling = NullValueHandling.Ignore)]
		public bool NewRelicTelemetryEnabled { get; set; }
	}

	public class CreatePostResponse {
		[JsonProperty("post", NullValueHandling = NullValueHandling.Ignore)]
		public CsFullPost Post { get; set; }
		[JsonProperty("codemark", NullValueHandling = NullValueHandling.Ignore)]
		public CsFullCodemark Codemark { get; set; }
		[JsonProperty("markers", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsMarker> Markers { get; set; }
		[JsonProperty("markerLocations", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsMarkerLocations> MarkerLocations { get; set; }
		[JsonProperty("streams", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsStream> Streams { get; set; }
		[JsonProperty("repos", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsRepository> Repos { get; set; }
	}

	public class ShowCodeResponse {
		public CsMarker Marker { get; set; }
		public bool EnteringThread { get; set; }
		public string Source { get; set; }
	}

	public class SourceRemote {
		public string Name { get; set; }
		public string Url { get; set; }
	}

	public class SourceAuthor {
		public string Id { get; set; }
		public string Username { get; set; }
	}

	public class Source {
		public string File { get; set; }
		public string RepoPath { get; set; }
		public string Revision { get; set; }
		public List<SourceAuthor> Authors { get; set; }
		public List<SourceRemote> Remotes { get; set; }
	}

	public class StreamThread {
		public StreamThread(string threadId, CsStream stream) {
			Id = threadId;
			Stream = stream;
		}

		/// <summary>
		/// Thread Id
		/// </summary>
		public string Id { get; }

		public CsStream Stream { get; }
	}

	public class TelemetryProperties : Dictionary<string, object> { }

	public class TelemetryRequest {
		[JsonProperty("eventName", NullValueHandling = NullValueHandling.Ignore)]
		public string EventName { get; set; }
		[JsonProperty("properties", NullValueHandling = NullValueHandling.Ignore)]
		public TelemetryProperties Properties { get; set; }
	}
	
	public class FetchCodemarksRequest {
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
	}

	public class FetchCodemarksResponse {
		[JsonProperty("markers", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsMarker> Markers { get; set; }
		[JsonProperty("codemarks", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsFullCodemark> Codemarks { get; set; }
	}

	public class DocumentMarkersFilters {
		public bool? ExcludeArchived { get; set; }
	}
	public class DocumentMarkersRequest {
		[JsonProperty("textDocument", NullValueHandling = NullValueHandling.Ignore)]
		public TextDocumentIdentifier TextDocument { get; set; }
		[JsonProperty("applyFilters", NullValueHandling = NullValueHandling.Ignore)]
		public bool ApplyFilters { get; set; }
	}

	public class DocumentMarkersResponse {
		[JsonProperty("markers", NullValueHandling = NullValueHandling.Ignore)]
		public List<DocumentMarker> Markers { get; set; }
		[JsonProperty("markersNotLocated", NullValueHandling = NullValueHandling.Ignore)]
		public List<MarkerNotLocated> MarkersNotLocated { get; set; }
	}

	public class FetchPostsRequest {
		public string StreamId { get; set; }
		public int? Limit { get; set; }
		public object After { get; set; }
		public object Before { get; set; }
		public bool? Inclusive { get; set; }
	}

	public abstract class LoginRequestBase<T> {
		[JsonProperty("serverUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string ServerUrl { get; set; }
		[JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
		public string Email { get; set; }
		[JsonProperty("passwordOrToken", NullValueHandling = NullValueHandling.Ignore)]
		public T PasswordOrToken { get; set; }
		[JsonProperty("signupToken", NullValueHandling = NullValueHandling.Ignore)]
		public string SignupToken { get; set; }
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("extension", NullValueHandling = NullValueHandling.Ignore)]
		public Extension Extension { get; set; }
		[JsonProperty("ide", NullValueHandling = NullValueHandling.Ignore)]
		public Ide Ide { get; set; }
		[JsonProperty("traceLevel", NullValueHandling = NullValueHandling.Ignore)]
		public string TraceLevel { get; set; }
		[JsonProperty("disableStrictSSL", NullValueHandling = NullValueHandling.Ignore)]
		public bool DisableStrictSSL { get; set; }
		[JsonProperty("isDebugging", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsDebugging { get; set; }
		[JsonProperty("proxySupport", NullValueHandling = NullValueHandling.Ignore)]
		public string ProxySupport { get; set; }
		[JsonProperty("proxy", NullValueHandling = NullValueHandling.Ignore)]
		public Proxy Proxy { get; set; }
		[JsonProperty("newRelicTelemetryEnabled", NullValueHandling = NullValueHandling.Ignore)]
		public bool NewRelicTelemetryEnabled { get; set; }
	}

	public class LoginRequest : LoginRequestBase<string> { }

	public class TokenLoginRequest {
		[JsonProperty("token", NullValueHandling = NullValueHandling.Ignore)]
		public JToken Token { get; set; }
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
	}

	public class TextDocumentIdentifier {
		[JsonProperty("uri", NullValueHandling = NullValueHandling.Ignore)]
		public string Uri { get; set; }
	}

	public class DocumentFromMarkerRequest {
		public DocumentFromMarkerRequest(CsMarker marker) {
			File = marker.File;
			RepoId = marker.RepoId;
			MarkerId = marker.Id;
		}

		public DocumentFromMarkerRequest(ICSMarkerIdentifier marker) {
			File = marker.File;
			RepoId = marker.RepoId;
			MarkerId = marker.Id;
		}

		[JsonProperty("file", NullValueHandling = NullValueHandling.Ignore)]
		public string File { get; set; }
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }
		[JsonProperty("markerId", NullValueHandling = NullValueHandling.Ignore)]
		public string MarkerId { get; set; }
	}

	public class DocumentFromMarkerResponse {
		[JsonProperty("textDocument", NullValueHandling = NullValueHandling.Ignore)]
		public TextDocumentIdentifier TextDocument { get; set; }
		[JsonProperty("marker", NullValueHandling = NullValueHandling.Ignore)]
		public CsMarker Marker { get; set; }
		[JsonProperty("range", NullValueHandling = NullValueHandling.Ignore)]
		public Range Range { get; set; }
		[JsonProperty("revision", NullValueHandling = NullValueHandling.Ignore)]
		public string Revision { get; set; }
	}

	public class CreateDirectStreamRequest {
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public string Type { get; set; }
		[JsonProperty("memberIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> MemberIds { get; set; }
	}

	public class GetPostRequest {
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("postId", NullValueHandling = NullValueHandling.Ignore)]
		public string PostId { get; set; }
	}

	public class GetPostResponse {
		[JsonProperty("post", NullValueHandling = NullValueHandling.Ignore)]
		public CsPost Post { get; set; }
	}

	public class GetUserRequest {
		[JsonProperty("userId", NullValueHandling = NullValueHandling.Ignore)]
		public string UserId { get; set; }
	}

	public class GetUserResponse {
		[JsonProperty("user", NullValueHandling = NullValueHandling.Ignore)]
		public CsUser User { get; set; }
	}

	public class GetFileStreamRequest {
		[JsonProperty("textDocument", NullValueHandling = NullValueHandling.Ignore)]
		public TextDocumentIdentifier TextDocument { get; set; }
	}

	public class GetFileStreamResponse {
		[JsonProperty("stream", NullValueHandling = NullValueHandling.Ignore)]
		public CsFileStream Stream { get; set; }
	}

	public class GetStreamRequest {
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public StreamType? Type { get; set; }
	}

	public class GetStreamResponse {
		[JsonProperty("stream", NullValueHandling = NullValueHandling.Ignore)]
		public CsStream Stream { get; set; }
	}

	public class CreateCodemarkRequestMarker {
		[JsonProperty("code", NullValueHandling = NullValueHandling.Ignore)]
		public string Code { get; set; }
		[JsonProperty("remotes", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> Remotes { get; set; }
		[JsonProperty("file", NullValueHandling = NullValueHandling.Ignore)]
		public string File { get; set; }
		[JsonProperty("commitHash", NullValueHandling = NullValueHandling.Ignore)]
		public string CommitHash { get; set; }
		[JsonProperty("location", NullValueHandling = NullValueHandling.Ignore)]
		public List<object> Location { get; set; } //CsLocationarray
	}

	public class CreateCodemarkRequest {
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public CodemarkType Type { get; set; }
		[JsonProperty("providerType", NullValueHandling = NullValueHandling.Ignore)]
		public ProviderType? ProviderType { get; set; }
		[JsonProperty("text", NullValueHandling = NullValueHandling.Ignore)]
		public string Text { get; set; }
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("postId", NullValueHandling = NullValueHandling.Ignore)]
		public string PostId { get; set; }
		[JsonProperty("parentPostId", NullValueHandling = NullValueHandling.Ignore)]
		public string ParentPostId { get; set; }
		[JsonProperty("color", NullValueHandling = NullValueHandling.Ignore)]
		public string Color { get; set; }
		[JsonProperty("status", NullValueHandling = NullValueHandling.Ignore)]
		public string Status { get; set; }
		[JsonProperty("title", NullValueHandling = NullValueHandling.Ignore)]
		public string Title { get; set; }
		[JsonProperty("assignees", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> Assignees { get; set; }
		[JsonProperty("markers", NullValueHandling = NullValueHandling.Ignore)]
		public List<CreateCodemarkRequestMarker> Markers { get; set; }
		[JsonProperty("remotes", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> Remotes { get; set; }
	}

	public class CreatePostRequest {
		[JsonProperty("streamId", NullValueHandling = NullValueHandling.Ignore)]
		public string StreamId { get; set; }
		[JsonProperty("text", NullValueHandling = NullValueHandling.Ignore)]
		public string Text { get; set; }
		[JsonProperty("mentionedUserIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> MentionedUserIds { get; set; }
		[JsonProperty("parentPostId", NullValueHandling = NullValueHandling.Ignore)]
		public string ParentPostId { get; set; }
		[JsonProperty("codemark", NullValueHandling = NullValueHandling.Ignore)]
		public CreateCodemarkRequest Codemark { get; set; }
	}

	public class FetchStreamsRequest {
		public List<StreamType> Types { get; set; }
		public List<string> MemberIds { get; set; }
	}

	public class FetchStreamsRequest2 {
		[JsonProperty("types", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> Types { get; set; }
		[JsonProperty("memberIds", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> MemberIds { get; set; }
	}

	public class FetchStreamsResponse {
		[JsonProperty("streams", NullValueHandling = NullValueHandling.Ignore)]
		public List<CsStream> Streams { get; set; }
	}
	 
}
