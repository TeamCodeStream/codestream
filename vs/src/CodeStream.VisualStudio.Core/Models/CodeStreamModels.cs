using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Annotations;
using CodeStream.VisualStudio.Core.Extensions;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;

// ReSharper disable ClassNeverInstantiated.Global

namespace CodeStream.VisualStudio.Core.Models {
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

		public bool Deactivated { get; set; }

		public long CreatedAt {
			get => _createdAt;
			set {
				_createdAt = value;
				CreateAtDateTime = value.FromLong().ToLocalTime();
			}
		}

		public DateTime CreateAtDateTime { get; private set; }

		public long ModifiedAt {
			get => _modifiedAt;
			set {
				_modifiedAt = value;
				ModifiedAtDateTime = value.FromLong().ToLocalTime();
			}
		}

		public DateTime ModifiedAtDateTime { get; private set; }

		public string Id { get; set; }
		// ReSharper disable once InconsistentNaming
		public string _Id { get; set; }
		public string CreatorId { get; set; }
		public int Version { get; set; }
	}

	public class File {
		public string Mimetype { get; set; }
		public string Name { get; set; }
		public string Title { get; set; }
		public string Type { get; set; }
		public string Url { get; set; }
		//NOTE this is some kind string | object
		public object Preview { get; set; }
	}

	public class CsPost : CsEntity {
		public string TeamId { get; set; }
		public string StreamId { get; set; }
		public string ParentPostId { get; set; }
		public int NumReplies { get; set; }
		public string Text { get; set; }
		public object SeqNum { get; set; }
		public bool HasBeenEdited { get; set; }
		public List<string> MentionedUserIds { get; set; }
		public string Origin { get; set; } //?: "email" | "slack" | "teams";
		public Dictionary<string, List<string>> Reactions { get; set; }

		public string CodemarkId { get; set; }
		public List<File> Files { get; set; }
	}

	public class CsFullPost : CsPost {
		public CsFullCodemark Codemark { get; set; }
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
		public string TeamId { get; set; }
		public string FileStreamId { get; set; }
		public string PostStreamId { get; set; }
		public string PostId { get; set; }
		public string CodemarkId { get; set; }
		public ProviderType? ProviderType { get; set; }
		public string CommitHashWhenCreated { get; set; }
		/// <summary>
		/// this is // export type CSLocationArray = [number, number, number, number, CSLocationMeta | undefined];
		/// </summary>
		public List<object> LocationWhenCreated { get; set; }
		public string Code { get; set; }
		public string File { get; set; }
		public string Repo { get; set; }
		public string RepoId { get; set; }
	}

	public class MarkerNotLocated : CsMarker {
		public string NotLocatedReason { get; set; }//: MarkerNotLocatedReason;
		public string NotLocatedDetails { get; set; }
	}

	public class CsMarkerLocations {
		public string TeamId { get; set; }
		public string StreamId { get; set; }
		public string CommitHash { get; set; }
		//NOTE this is a bizarro shaped object
		public Dictionary<string, List<object>> Locations { get; set; }
	}

	public class CsCodemark : CsEntity {
		public string TeamId { get; set; }
		public string StreamId { get; set; }
		public string PostId { get; set; }
		public string ParentPostId { get; set; }
		public List<string> MarkerIds { get; set; }
		public List<string> FileStreamIds { get; set; }
		public ProviderType? ProviderType { get; set; }
		public CodemarkType Type { get; set; }		
		public string Status { get; set; }
		public string Title { get; set; }
		public List<string> Assignees { get; set; }
		public string Text { get; set; }

		public int NumReplies { get; set; }

		public bool Pinned { get; set; }
		public List<string> PinnnedReplies { get; set; }

		public List<ExternalAssignee> ExternalAssignees { get; set; }
		public string ExternalProvider { get; set; }
		public string EexternalProviderHost { get; set; }
		public string ExternalProviderUrl { get; set; }
	}

	public class ExternalAssignee {
		public string DisplayName { get; set; }
		public string Email { get; set; }
	}

	public class DocumentMarker : CsEntity, ICSMarkerIdentifier {
		public string TeamId { get; set; }
		public string FileStreamId { get; set; }
		public string CodemarkId { get; set; }
		public string Code { get; set; }
		public string Color {
			get {
				// TODO: -- Use a setting?
				return !Pinned ? "gray" : Status == "closed" ? "purple" : "green";				
			}
		}
		public string CreatorAvatar { get; set; }
		public string CreatorName { get; set; }
		public string CommitHashWhenCreated { get; set; }
		public CsCodemark Codemark { get; set; }
		public ExternalContent ExternalContent { get; set; }
		public Range Range { get; set; }
		public bool Pinned {
			get {
				return Codemark?.Pinned == true;
			}
		}
		public string Status {
			get {				
				return Codemark?.Status ?? "open";
			}
		}
		public string Summary { get; set; }
		public string SummaryMarkdown { get; set; }
		public CodemarkType Type { get; set; }
		public string File { get; set; }
		public string RepoId { get; set; }
	}

	public class ExternalContent {
		public ExternalContentProvider Provider { get; set; }
		public string Subhead { get; set; }
		public List<ExternalContentActions> Actions { get; set; }
	}

	public class ExternalContentProvider {
		public string Name { get; set; }
		public string Icon { get; set; }
	}

	public class ExternalContentActions {
		public string Label { get; set; }
		public string Icon { get; set; }
		public string Uri { get; set; }
	}

	public class CsFullCodemark : CsMarker {
		public List<CsMarker> Markers { get; set; }
	}

	// TODO these stream objects are not nice

	public class CsStream : CsEntity {
		public CsStream() {
			MemberIds = new List<string>();
		}

		public bool IsArchived { get; set; }
		public string Privacy { get; set; }
		public string SortId { get; set; }
		public string TeamId { get; set; }
		public long? MostRecentPostCreatedAt { get; set; }
		public string MostRecentPostId { get; set; }
		public string Purpose { get; set; }
		public string Type { get; set; }
		public string File { get; set; }
		public string RepoId { get; set; }
		public int NumMarkers { get; set; }
		public object EditingUSsrs { get; set; }

		//direct
		public bool? IsClosed { get; set; }
		public string Name { get; set; }
		public List<string> MemberIds { get; set; }
		public int? Priority { get; set; }

		//channel stream
		public bool IsTeamStream { get; set; }
		public string ServiceType { get; set; }
		public string ServiceKey { get; set; }
		public Dictionary<string, object> ServiceInfo { get; set; }
	}

	public class CsDirectStream : CsStream {
	}

	public class CsFileStream : CsStream {

	}

	public class CsUser : CsEntity {
		public List<string> CompanyIds { get; set; }
		public string Email { get; set; }
		public string FirstName { get; set; }
		public string FullName { get; set; }
		public bool IsRegistered { get; set; }
		// ReSharper disable once InconsistentNaming
		public string IWorkOn { get; set; }
		public string LastName { get; set; }
		public long LastPostCreatedAt { get; set; }
		public int NumMentions { get; set; }
		public int NumInvites { get; set; }
		public long RegisteredAt { get; set; }
		public List<string> SecondaryEmails { get; set; }
		public List<string> TeamIds { get; set; }
		public string TimeZone { get; set; }
		public int TotalPosts { get; set; }
		public string Username { get; set; }
		public bool? Dnd { get; set; }
		public string Presence { get; set; }

		public string Name {
			get { return Username ?? FullName; }
		}
	}

	public class CsTeam {
		public string Id { get; set; }
		public string Name { get; set; }
	}

	public class CsRemote {
		public string Url { get; set; }
		public string NormalizedUrl { get; set; }
		public string CompanyIdentifier { get; set; }
	}

	public class CsRepository {
		public string Name { get; set; }
		public List<CsRemote> Remotes { get; set; }
		public string TeamId { get; set; }
	}

	public class Extension {
		[JsonProperty("build")]
		public string Build { get; set; }
		[JsonProperty("buildEnv")]
		public string BuildEnv { get; set; }
		[JsonProperty("version")]
		public string Version { get; set; }
		[JsonProperty("versionFormatted")]
		public string VersionFormatted { get; set; }
	}

	public class Ide {
		[NotNull]
		[JsonProperty("name")]
		public string Name { get; set; }

		[JsonProperty("version")]
		public string Version { get; set; }

		[NotNull]
		[JsonProperty("detail")]
		public string Detail { get; set; }
	}

	public class Proxy {
		[JsonProperty("url")]
		public string Url { get; set; }
		[JsonProperty("strictSSL")]
		public bool StrictSSL { get; set; }
	}

	[JsonConverter(typeof(StringEnumConverter))]
	public enum ProxySupport {
		On,
		Off
	}

	public class InitializationOptions {
		[JsonProperty("serverUrl")]
		public string ServerUrl { get; set; }
		//public string GitPath { get; set; }

		[JsonProperty("ide")]
		public Ide Ide { get; set; }
		[JsonProperty("extension")]
		public Extension Extension { get; set; }
		[JsonProperty("traceLevel")]
		public string TraceLevel { get; set; }
		[JsonProperty("isDebugging")]
		public bool IsDebugging { get; set; }
		[JsonProperty("proxySupport")]
		public string ProxySupport { get; set; }
		[JsonProperty("proxy")]
		public Proxy Proxy { get; set; }

		[JsonProperty("disableStrictSSL")]
		// ReSharper disable once InconsistentNaming
		public bool DisableStrictSSL { get; set; }
	}

	public class CreatePostResponse {
		public CsFullPost Post { get; set; }
		public CsFullCodemark Codemark { get; set; }
		public List<CsMarker> Markers { get; set; }

		public List<CsMarkerLocations> MarkerLocations { get; set; }
		public List<CsStream> Streams { get; set; }
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
		public string EventName { get; set; }
		public TelemetryProperties Properties { get; set; }
	}

	//public class PrepareCodeRequest
	//{
	//    public TextDocumentIdentifier TextDocument { get; set; }
	//    public Range Range { get; set; }
	//    public bool Dirty { get; set; }
	//}

	//public class PrepareCodeResponse
	//{
	//    public string Code { get; set; }
	//    public Range Range { get; set; }
	//    public string GitError { get; set; }
	//    public Source Source { get; set; }
	//}

	public class FetchCodemarksRequest {
		public string StreamId { get; set; }
	}

	public class FetchCodemarksResponse {
		public List<CsMarker> Markers { get; set; }
		public List<CsFullCodemark> Codemarks { get; set; }
	}

	public class DocumentMarkersFilters {
		public bool? ExcludeArchived { get; set; }
	}
	public class DocumentMarkersRequest {
		public TextDocumentIdentifier TextDocument { get; set; }
		public bool ApplyFilters { get; set; }
	}

	public class DocumentMarkersResponse {
		public List<DocumentMarker> Markers { get; set; }
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
		public string ServerUrl { get; set; }
		public string Email { get; set; }
		public T PasswordOrToken { get; set; }
		public string SignupToken { get; set; }
		public string Team { get; set; }
		public string TeamId { get; set; }
		public Extension Extension { get; set; }
		public Ide Ide { get; set; }
		public string TraceLevel { get; set; }

		[JsonProperty("disableStrictSSL")]
		// ReSharper disable once InconsistentNaming
		public bool DisableStrictSSL { get; set; }
		public bool IsDebugging { get; set; }
		[JsonProperty("proxySupport")]
		public string ProxySupport { get; set; }
		[JsonProperty("proxy")]
		public Proxy Proxy { get; set; }
	}

	public class LoginRequest : LoginRequestBase<string> { }

	public class TokenLoginRequest {
		public JToken Token { get; set; }
		public string TeamId { get; set; }
		public string Team { get; set; }
	}

	public class TextDocumentIdentifier {
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


		public string File { get; set; }
		public string RepoId { get; set; }
		public string MarkerId { get; set; }
	}

	public class DocumentFromMarkerResponse {
		public TextDocumentIdentifier TextDocument { get; set; }
		public CsMarker Marker { get; set; }
		public Range Range { get; set; }
		public string Revision { get; set; }
	}

	public class CreateDirectStreamRequest {
		public string Type { get; set; }
		public List<string> MemberIds { get; set; }
	}

	public class GetPostRequest {
		public string StreamId { get; set; }
		public string PostId { get; set; }
	}

	public class GetPostResponse {
		public CsPost Post { get; set; }
	}

	public class GetUserRequest {
		public string UserId { get; set; }
	}

	public class GetUserResponse {
		public CsUser User { get; set; }
	}

	public class GetFileStreamRequest {
		public TextDocumentIdentifier TextDocument { get; set; }
	}

	public class GetFileStreamResponse {
		public CsFileStream Stream { get; set; }
	}

	public class GetStreamRequest {
		public string StreamId { get; set; }
		public StreamType? Type { get; set; }
	}

	public class GetStreamResponse {
		public CsStream Stream { get; set; }
	}

	public class CreateCodemarkRequestMarker {
		public string Code { get; set; }
		public List<string> Remotes { get; set; }
		public string File { get; set; }
		public string CommitHash { get; set; }
		public List<object> Location { get; set; } //CsLocationarray
	}

	public class CreateCodemarkRequest {
		public CodemarkType Type { get; set; }
		public ProviderType? ProviderType { get; set; }
		public string Text { get; set; }
		public string StreamId { get; set; }
		public string PostId { get; set; }
		public string ParentPostId { get; set; }
		public string Color { get; set; }
		public string Status { get; set; }
		public string Title { get; set; }
		public List<string> Assignees { get; set; }
		public List<CreateCodemarkRequestMarker> Markers { get; set; }
		public List<string> Remotes { get; set; }
	}

	public class CreatePostRequest {
		public string StreamId { get; set; }
		public string Text { get; set; }
		public List<string> MentionedUserIds { get; set; }
		public string ParentPostId { get; set; }
		public CreateCodemarkRequest Codemark { get; set; }
	}

	public class FetchStreamsRequest {
		public List<StreamType> Types { get; set; }
		public List<string> MemberIds { get; set; }
	}

	public class FetchStreamsRequest2 {
		public List<string> Types { get; set; }
		public List<string> MemberIds { get; set; }
	}

	public class FetchStreamsResponse {
		public List<CsStream> Streams { get; set; }
	}
	 
}
