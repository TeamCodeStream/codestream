using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Logging;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models {

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
		public static string Codemarks = "knowledge";
		public static string CodemarksForFile = "codemarks-for-file";
	}

	[Serializable]
	public class WebviewContext {
		public string CurrentTeamId { get; set; }
		public string CurrentStreamId { get; set; }
		public string ThreadId { get; set; }
		public bool HasFocus { get; set; }
		public List<string> PanelStack { get; set; }
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
		public string UserId { get; set; }
	}

	public class Services {
		public bool? Vsls { get; set; }
	}

	public class Capabilities {
		public bool? ChannelMute { get; set; }
		public bool? CodemarkApply { get; set; }
		public bool? CodemarkCompare { get; set; }
		public bool? CodemarkOpenRevision { get; set; }
		public bool? EditorTrackVisibleRange { get; set; }
		public bool? PostDelete { get; set; }
		public bool? PostEdit { get; set; }
		public bool? ProviderCanSupportRealtimeChat { get; set; }
		public bool? ProviderSupportsRealtimeChat { get; set; }
		public bool? ProviderSupportsRealtimeEvents { get; set; }
		public Services Services { get; set; }
	}

	public class Configs {
		public Configs() {
#if DEBUG
			Debug = true;
#endif
		}

		public bool Debug { get; set; }
		public string ServerUrl { get; set; }
		public string Email { get; set; }
		public bool ShowAvatars { get; set; }
		public bool AutoHideMarkers { get; set; }
		public bool ShowMarkerGlyphs { get; set; }
		public TraceLevel TraceLevel { get; set; }
	}

	public class BootstrapPartialRequest { }

	public class BootstrapPartialResponseAnonymous {
		public Capabilities Capabilities { get; set; }
		public Configs Configs { get; set; }
		public string Version { get; set; }
		public WebviewContext Context { get; set; }
		public UserSession Session { get; set; }
		public Ide Ide { get; set; }
		public CodeStreamEnvironmentInfo EnvironmentInfo { get; set; }
	}

	public class BootstrapAuthenticatedResponse : BootstrapPartialResponseAnonymous {
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

		public string ServerUrl { get; }
		public bool? DisableStrictSSL { get; }
		public string Environment { get; }
	}

	public class SetServerUrlResponse { }

	public class SetServerUrlRequestType : RequestType<SetServerUrlResponse> {
		public static string MethodName = "codestream/set-server";
		public override string Method => MethodName;
	}

	public class AgentOpenUrlRequest {
		public string Url { get; set; }
	}

	public class AgentOpenUrlResponse { }

	public class AgentOpenUrlRequestType : RequestType<AgentOpenUrlResponse> {
		public const string MethodName = "codestream/url/open";
		public override string Method => MethodName;
	}

	public class GetReviewContentsRequest {
		public string ReviewId { get; set; }
		public int? Checkpoint { get; set; }
		public string RepoId { get; set; }
		public string Path { get; set; }
	}

	public class GetReviewContentsResponse {
		public string Left { get; set; }
		public string Right { get; set; }
		public bool? FileNotIncludedInReview { get; set; }
		public string error { get; set; }
	}

	public class GetReviewContentsRequestType : RequestType<GetReviewContentsRequest> {
		public const string MethodName = "codestream/review/contents";
		public override string Method => MethodName;
	}


	public class GetReviewContentsLocalRequest {
		public string RepoId { get; set; }
		public string Path { get; set; }
		public string EditingReviewId { get; set; }
		public string BaseSha { get; set; }
		public string RightVersion { get; set; }
	}

	public class GetReviewContentsLocalRequestType : RequestType<GetReviewContentsLocalRequest> {
		public const string MethodName = "codestream/review/contentsLocal";
		public override string Method => MethodName;
	}

	public class GetReviewContentsLocalResponse {
		public string Left { get; set; }
		public string Right { get; set; }
		public bool? FileNotIncludedInReview { get; set; }
		public string Error { get; set; }
	}

	public class CSReview {
		public string Title { get; set; }
	}
	public class GetReviewRequest {
		public string ReviewId { get; set; }
	}

	public class GetReviewResponse {
		public CSReview Review { get; set; }
	}

	public class GetReviewRequestType : RequestType<GetReviewRequest> {
		public const string MethodName = "codestream/review";
		public override string Method => MethodName;
	}

}
