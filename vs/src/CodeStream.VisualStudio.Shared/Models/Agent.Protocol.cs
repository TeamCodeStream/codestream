using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace CodeStream.VisualStudio.Shared.Models {

	public class EditorMargins {
		public int? Top { get; set; }
		public int? Right { get; set; }
		public int? Bottom { get; set; }
		public int? Left { get; set; }
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum EditorScrollMode {
		Pixels,
		Lines
	}

	public class EditorMetrics {
		public int? FontSize { get; set; }
		public int? LineHeight { get; set; }
		public EditorMargins EditorMargins { get; set; }
		public EditorScrollMode? ScrollMode { get; set; }
		public double? ScrollRatio { get; set; }
	}

	public static class WebviewPanels {
		public static string CodemarksForFile = "codemarks-for-file";
		public static string LandingRedirect = "landing-redirect";
	}

	[Serializable]
	public class TeamlessContext {
		[JsonProperty("selectedRegion", NullValueHandling = NullValueHandling.Ignore)]
		public string SelectedRegion { get; set; }
		[JsonProperty("forceRegion", NullValueHandling = NullValueHandling.Ignore)]
		public string ForceRegion { get; set; }
	}

	[Serializable]
	public class CurrentRepo {
		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }
		[JsonProperty("path", NullValueHandling = NullValueHandling.Ignore)]
		public string Path { get; set; }
	}

	[Serializable]
	public class CurrentReviewOptions {
		[JsonProperty("includeLatestCommit", NullValueHandling = NullValueHandling.Ignore)]
		public bool? IncludeLatestCommit { get; set; }
		[JsonProperty("openFirstDiff", NullValueHandling = NullValueHandling.Ignore)]
		public bool? OpenFirstDiff { get; set; }
	}

	[Serializable]
	public class CurrentCodeErrorData {
		[JsonProperty("remote", NullValueHandling = NullValueHandling.Ignore)]
		public string Remote { get; set; }
		[JsonProperty("commit", NullValueHandling = NullValueHandling.Ignore)]
		public string Commit { get; set; }
		[JsonProperty("tag", NullValueHandling = NullValueHandling.Ignore)]
		public string Tag { get; set; }
		[JsonProperty("sessionStart", NullValueHandling = NullValueHandling.Ignore)]
		public long? SessionStart { get; set; }
		[JsonProperty("pendingRequiresConnection", NullValueHandling = NullValueHandling.Ignore)]
		public bool PendingRequiresConnection { get; set; }
		[JsonProperty("pendingErrorGroupGuid", NullValueHandling = NullValueHandling.Ignore)]
		public string PendingErrorGroupGuid { get; set; }
		[JsonProperty("pendingEntityId", NullValueHandling = NullValueHandling.Ignore)]
		public string PendingEntityId { get; set; }
		[JsonProperty("occurrenceId", NullValueHandling = NullValueHandling.Ignore)]
		public string OccurrenceId { get; set; }
		[JsonProperty("lineIndex", NullValueHandling = NullValueHandling.Ignore)]
		public int? LineIndex { get; set; }
		[JsonProperty("timestamp", NullValueHandling = NullValueHandling.Ignore)]
		public long? Timestamp { get; set; }
		[JsonProperty("openType", NullValueHandling = NullValueHandling.Ignore)]
		public string OpenType { get; set; }
		[JsonProperty("multipleRepos", NullValueHandling = NullValueHandling.Ignore)]
		public bool? MultipleRepos { get; set; }
		[JsonProperty("claimWhenConnected", NullValueHandling = NullValueHandling.Ignore)]
		public bool? ClaimWhenConnected { get; set; }
	}

	[Serializable]
	public class RemoteProvider {
		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("domain", NullValueHandling = NullValueHandling.Ignore)]
		public string Domain { get; set; }
	}

	[Serializable]
	public class PullRequestRemote {
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("provider", NullValueHandling = NullValueHandling.Ignore)]
		public RemoteProvider Provider { get; set; }
		[JsonProperty("url", NullValueHandling = NullValueHandling.Ignore)]
		public string Url { get; set; }
	}

	[Serializable]
	public class CreatePullRequestOptions {
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("remote", NullValueHandling = NullValueHandling.Ignore)]
		public PullRequestRemote Remote { get; set; }
		[JsonProperty("repoPath", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoPath { get; set; }
	}

	[Serializable]
	public class CurrentPullRequest {
		[JsonProperty("providerId", NullValueHandling = NullValueHandling.Ignore)]
		public string ProviderId { get; set; }
		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }
		[JsonProperty("commentId", NullValueHandling = NullValueHandling.Ignore)]
		public string CommentId { get; set; }
		[JsonProperty("source", NullValueHandling = NullValueHandling.Ignore)]
		public string Source { get; set; }
		[JsonProperty("metadata", NullValueHandling = NullValueHandling.Ignore)]
		public object Metadata { get; set; }
		[JsonProperty("view", NullValueHandling = NullValueHandling.Ignore)]
		public string View { get; set; }
		[JsonProperty("previousView", NullValueHandling = NullValueHandling.Ignore)]
		public string PreviousView { get; set; }
		[JsonProperty("groupIndex", NullValueHandling = NullValueHandling.Ignore)]
		public string GroupIndex { get; set; }
	}

	[Serializable]
	public class WebviewContext {
		[JsonProperty("currentTeamId", NullValueHandling = NullValueHandling.Ignore)]
		public string CurrentTeamId { get; set; }
		[JsonProperty("sessionStart", NullValueHandling = NullValueHandling.Ignore)]
		public long? SessionStart { get; set; }
		[JsonProperty("currentStreamId", NullValueHandling = NullValueHandling.Ignore)]
		public string CurrentStreamId { get; set; }
		[JsonProperty("threadId", NullValueHandling = NullValueHandling.Ignore)]
		public string ThreadId { get; set; }
		[JsonProperty("currentRepo", NullValueHandling = NullValueHandling.Ignore)]
		public CurrentRepo CurrentRepo { get; set; }
		[JsonProperty("currentCodemarkId", NullValueHandling = NullValueHandling.Ignore)]
		public string CurrentCodemarkId { get; set; }
		[JsonProperty("currentReviewId", NullValueHandling = NullValueHandling.Ignore)]
		public string CurrentReviewId { get; set; }
		[JsonProperty("currentReviewOptions", NullValueHandling = NullValueHandling.Ignore)]
		public CurrentReviewOptions CurrentReviewOptions { get; set; }
		[JsonProperty("currentCodeErrorId", NullValueHandling = NullValueHandling.Ignore)]
		public string CurrentCodeErrorId { get; set; }
		[JsonProperty("currentCodeErrorData", NullValueHandling = NullValueHandling.Ignore)]
		public CurrentCodeErrorData CurrentCodeErrorData { get; set; }
		[JsonProperty("createPullRequestReviewId", NullValueHandling = NullValueHandling.Ignore)]
		public string CreatePullRequestReviewId { get; set; }
		[JsonProperty("createPullRequestOptions", NullValueHandling = NullValueHandling.Ignore)]
		public CreatePullRequestOptions CreatePullRequestOptions { get; set; }
		[JsonProperty("currentPullRequest", NullValueHandling = NullValueHandling.Ignore)]
		public CurrentPullRequest CurrentPullRequest { get; set; }
		[JsonProperty("profileUserId", NullValueHandling = NullValueHandling.Ignore)]
		public string ProfileUserId { get; set; }
		[JsonProperty("currentMarkId", NullValueHandling = NullValueHandling.Ignore)]
		public string CurrentMarkerId { get; set; }
		[JsonProperty("isRepositioning", NullValueHandling = NullValueHandling.Ignore)]
		public bool? IsRepositioning { get; set; }
		[JsonProperty("hasFocus", NullValueHandling = NullValueHandling.Ignore)]
		public bool HasFocus { get; set; }
		[JsonProperty("isFirstPageview", NullValueHandling = NullValueHandling.Ignore)]
		public bool? IsFirstPageView { get; set; }
		[JsonProperty("panelStack", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> PanelStack { get; set; }
		[JsonProperty("forceRegion", NullValueHandling = NullValueHandling.Ignore)]
		public string ForceRegion { get; set; }

		/// <summary>
		/// Special property used when user is not authenticated
		/// </summary>
		[JsonProperty("__teamless__", NullValueHandling = NullValueHandling.Ignore)]
		public TeamlessContext Teamless { get; set; }
	}

	public class EditorContext {
		public GetRangeScmInfoResponse Scm { get; set; }
		public string ActiveFile { get; set; }
		public string LastActiveFile { get; set; }
		public List<Range> TextEditorVisibleRanges { get; set; }
		public string TextEditorUri { get; set; }
		public List<EditorSelection> TextEditorSelections { get; set; }
		public EditorMetrics Metrics { get; set; }
		public int? TextEditorLineCount { get; set; }
	}

	public class UserSession {
		[JsonProperty("userId", NullValueHandling = NullValueHandling.Ignore)]
		public string UserId { get; set; }
		[JsonProperty("eligibleJoinCompanies", NullValueHandling = NullValueHandling.Ignore)]
		public JToken EligibleJoinCompanies { get; set; }
	}

	public class Services {
		[JsonProperty("vsls", NullValueHandling = NullValueHandling.Ignore)]
		public bool? Vsls { get; set; }
	}

	public class Capabilities {
		[JsonProperty("channelMute", NullValueHandling = NullValueHandling.Ignore)]
		public bool? ChannelMute { get; set; }
		[JsonProperty("codemarkApply", NullValueHandling = NullValueHandling.Ignore)]
		public bool? CodemarkApply { get; set; }
		[JsonProperty("codemarkCompare", NullValueHandling = NullValueHandling.Ignore)]
		public bool? CodemarkCompare { get; set; }
		[JsonProperty("codemarkOpenRevision", NullValueHandling = NullValueHandling.Ignore)]
		public bool? CodemarkOpenRevision { get; set; }
		[JsonProperty("editorTrackVisibleRange", NullValueHandling = NullValueHandling.Ignore)]
		public bool? EditorTrackVisibleRange { get; set; }
		[JsonProperty("postDelete", NullValueHandling = NullValueHandling.Ignore)]
		public bool? PostDelete { get; set; }
		[JsonProperty("postEdit", NullValueHandling = NullValueHandling.Ignore)]
		public bool? PostEdit { get; set; }
		[JsonProperty("providerCanSupportRealtimeChat", NullValueHandling = NullValueHandling.Ignore)]
		public bool? ProviderCanSupportRealtimeChat { get; set; }
		[JsonProperty("providerSupportsRealtimeChat", NullValueHandling = NullValueHandling.Ignore)]
		public bool? ProviderSupportsRealtimeChat { get; set; }
		[JsonProperty("providerSupportsRealtimeEvents", NullValueHandling = NullValueHandling.Ignore)]
		public bool? ProviderSupportsRealtimeEvents { get; set; }
		[JsonProperty("services", NullValueHandling = NullValueHandling.Ignore)]
		public Services Services { get; set; }
	}

	public class Configs {
		public Configs() {
#if DEBUG
			Debug = true;
#endif
		}

		[JsonProperty("debug", NullValueHandling = NullValueHandling.Ignore)]
		public bool Debug { get; set; }
		[JsonProperty("serverUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string ServerUrl { get; set; }
		[JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
		public string Email { get; set; }
		[JsonProperty("showAvatars", NullValueHandling = NullValueHandling.Ignore)]
		public bool ShowAvatars { get; set; }
		[JsonProperty("autoHideMarkers", NullValueHandling = NullValueHandling.Ignore)]
		public bool AutoHideMarkers { get; set; }
		[JsonProperty("showMarkerGlyphs", NullValueHandling = NullValueHandling.Ignore)]
		public bool ShowMarkerGlyphs { get; set; }
		[JsonProperty("traceLevel", NullValueHandling = NullValueHandling.Ignore)]
		public TraceLevel TraceLevel { get; set; }
		[JsonProperty("showGoldenSignalsInEditor", NullValueHandling = NullValueHandling.Ignore)]
		public bool ShowGoldenSignalsInEditor { get; set; }
	}

	public class BootstrapPartialRequest { }

	public class BootstrapPartialResponseAnonymous {
		[JsonProperty("capabilities", NullValueHandling = NullValueHandling.Ignore)]
		public Capabilities Capabilities { get; set; }
		[JsonProperty("configs", NullValueHandling = NullValueHandling.Ignore)]
		public Configs Configs { get; set; }
		[JsonProperty("version", NullValueHandling = NullValueHandling.Ignore)]
		public string Version { get; set; }
		[JsonProperty("context", NullValueHandling = NullValueHandling.Ignore)]
		public WebviewContext Context { get; set; }
		[JsonProperty("session", NullValueHandling = NullValueHandling.Ignore)]
		public UserSession Session { get; set; }
		[JsonProperty("ide", NullValueHandling = NullValueHandling.Ignore)]
		public Ide Ide { get; set; }
		[JsonProperty("stream", NullValueHandling = NullValueHandling.Ignore)]
		public CodeStreamEnvironmentInfo EnvironmentInfo { get; set; }
	}

	public class BootstrapAuthenticatedResponse : BootstrapPartialResponseAnonymous {
		[JsonProperty("editorContext", NullValueHandling = NullValueHandling.Ignore)]
		public EditorContext EditorContext { get; set; }
	}

	public class BootstrapRequestType : RequestType<BootstrapAuthenticatedResponse> {
		public static string MethodName = "codestream/bootstrap";
		public override string Method => MethodName;
	}

	public class SetServerUrlRequest {
		public SetServerUrlRequest(string serverUrl, bool? disableStrictSSL, string environment = null) {
			ServerUrl = serverUrl;
			DisableStrictSSL = disableStrictSSL;
			Environment = environment;
		}

		[JsonProperty("serverUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string ServerUrl { get; }
		[JsonProperty("disableStrictSsl", NullValueHandling = NullValueHandling.Ignore)]
		public bool? DisableStrictSSL { get; }
		[JsonProperty("environment", NullValueHandling = NullValueHandling.Ignore)]
		public string Environment { get; }
	}

	public class SetServerUrlResponse { }

	public class SetServerUrlRequestType : RequestType<SetServerUrlResponse> {
		public static string MethodName = "codestream/set-server";
		public override string Method => MethodName;
	}

	public class AgentOpenUrlRequest {
		[JsonProperty("url", NullValueHandling = NullValueHandling.Ignore)]
		public string Url { get; set; }
	}

	public class AgentOpenUrlResponse { }

	public class AgentOpenUrlRequestType : RequestType<AgentOpenUrlResponse> {
		public const string MethodName = "codestream/url/open";
		public override string Method => MethodName;
	}

	public class ResolveStackTracePathsRequest  {
		[JsonProperty("paths", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> Paths { get; set; } = new List<string>();

		[JsonProperty("language", NullValueHandling = NullValueHandling.Ignore)]
		public string Language { get; set; }
	}

	public class ResolveStackTracePathsResponse {
		[JsonProperty("resolvedPaths", NullValueHandling = NullValueHandling.Ignore)]
		public List<string> ResolvedPaths { get; set; } = new List<string>();

		[JsonProperty("notImplemented", NullValueHandling = NullValueHandling.Ignore)]
		public bool? NotImplemented { get; set; }
	}

	public class ResolveStackTracePathsRequestType : RequestType<ResolveStackTracePathsResponse> {
		public const string MethodName = "codestream/stackTrace/resolvePaths";
		public override string Method => MethodName;
	}

	public class GetReviewContentsRequest {
		[JsonProperty("reviewId", NullValueHandling = NullValueHandling.Ignore)]
		public string ReviewId { get; set; }
		[JsonProperty("checkpoint", NullValueHandling = NullValueHandling.Ignore)]
		public int? Checkpoint { get; set; }
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }
		[JsonProperty("path", NullValueHandling = NullValueHandling.Ignore)]
		public string Path { get; set; }
	}

	public class GetReviewContentsResponse {
		[JsonProperty("left", NullValueHandling = NullValueHandling.Ignore)]
		public string Left { get; set; }
		[JsonProperty("right", NullValueHandling = NullValueHandling.Ignore)]
		public string Right { get; set; }
		[JsonProperty("fileNotIncludedInReview", NullValueHandling = NullValueHandling.Ignore)]
		public bool? FileNotIncludedInReview { get; set; }
		[JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
		public string Error { get; set; }
	}

	public class GetReviewContentsRequestType : RequestType<GetReviewContentsRequest> {
		public const string MethodName = "codestream/review/contents";
		public override string Method => MethodName;
	}


	public class GetReviewContentsLocalRequest {
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }
		[JsonProperty("path", NullValueHandling = NullValueHandling.Ignore)]
		public string Path { get; set; }
		[JsonProperty("editingReviewId", NullValueHandling = NullValueHandling.Ignore)]
		public string EditingReviewId { get; set; }
		[JsonProperty("baseSha", NullValueHandling = NullValueHandling.Ignore)]
		public string BaseSha { get; set; }
		[JsonProperty("rightVersion", NullValueHandling = NullValueHandling.Ignore)]
		public string RightVersion { get; set; }
	}

	public class GetReviewContentsLocalRequestType : RequestType<GetReviewContentsLocalRequest> {
		public const string MethodName = "codestream/review/contentsLocal";
		public override string Method => MethodName;
	}

	public class GetReviewContentsLocalResponse {
		[JsonProperty("left", NullValueHandling = NullValueHandling.Ignore)]
		public string Left { get; set; }
		[JsonProperty("right", NullValueHandling = NullValueHandling.Ignore)]
		public string Right { get; set; }
		[JsonProperty("fileNotIncludedInReview", NullValueHandling = NullValueHandling.Ignore)]
		public bool? FileNotIncludedInReview { get; set; }
		[JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
		public string Error { get; set; }
	}

	public class CsReview {
		[JsonProperty("title", NullValueHandling = NullValueHandling.Ignore)]
		public string Title { get; set; }
	}
	public class GetReviewRequest {
		[JsonProperty("reviewId", NullValueHandling = NullValueHandling.Ignore)]
		public string ReviewId { get; set; }
	}

	public class GetReviewResponse {
		[JsonProperty("review", NullValueHandling = NullValueHandling.Ignore)]
		public CsReview Review { get; set; }
	}

	public class GetReviewRequestType : RequestType<GetReviewRequest> {
		public const string MethodName = "codestream/review";
		public override string Method => MethodName;
	}

}
