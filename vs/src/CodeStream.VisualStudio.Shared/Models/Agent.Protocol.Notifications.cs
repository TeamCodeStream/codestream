using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
	public class DidChangeConnectionStatusNotification {
		public bool? Reset { get; set; }
		public ConnectionStatus Status { get; set; }
	}

	public class DidChangeConnectionStatusNotificationType : NotificationType<DidChangeConnectionStatusNotification> {
		public DidChangeConnectionStatusNotificationType(DidChangeConnectionStatusNotification @params) {
			Params = @params;
		}

		public const string MethodName = "codestream/didChangeConnectionStatus";
		public override string Method => MethodName;
	}

	public class DidChangeUserPreferencesData {
		public bool? CodemarksShowPRComments { get; set; }
		public bool? CodemarksHideReviews { get; set; }
		public bool? CodemarksHideResolved { get; set; }
		public bool? CodemarksShowArchived { get; set; }
	}

	public class DidChangeUnreadsData {
		// there are other properties in the agent that are not mapped here
		public int TotalMentions { get; set; }
		public int TotalUnreads { get; set; }
	}

	public class DidChangeUserPreferencesEvent {
		public string Type { get; set; } = "preferences";
		public DidChangeUserPreferencesData Data { get; set; }
	}

	public class DidChangeUnreadsEvent {
		public string Type { get; set; } = "unreads";
		public DidChangeUnreadsData Data { get; set; }
	}

	public class DidChangeDataNotificationTypeParams {

	}
	public class DidChangeDataNotificationType : NotificationType<DidChangeDataNotificationTypeParams> {
		private readonly JToken _token;

		public DidChangeDataNotificationType(JToken token) {
			_token = token;
		}

		public const string MethodName = "codestream/didChangeData";
		public override string Method => MethodName;

		public override string AsJson() {
			return CustomNotificationPayload.Create(Method, _token);
		}
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum ApiVersionCompatibility {
		ApiCompatible,
		ApiUpgradeRecommended,
		ApiUpgradeRequired
	}

	// not actually used -- JToken is used so we dont have to deserialze, then serialize
	public class DidChangeApiVersionCompatibilityNotification {
		public ApiVersionCompatibility Compatibility { get; set; }
		public string Version { get; set; }
		public CSApiCapabilities MissingCapabilities { get; set; }
	}

	public class DidChangeApiVersionCompatibilityNotificationType : NotificationType<DidChangeApiVersionCompatibilityNotification> {
		private readonly JToken _token;
		public DidChangeApiVersionCompatibilityNotificationType(JToken token) {
			_token = token;
		}
		public const string MethodName = "codestream/didChangeApiVersionCompatibility";
		public override string Method => MethodName;
		public override string AsJson() {
			return CustomNotificationPayload.Create(Method, _token);
		}
	}

	public class CSApiCapabilities : Dictionary<string, CSApiCapability> {

	}

	public class CSApiCapability {
		public string Description { get; set; }
		public string Url { get; set; }
		public string Version { get; set; }
	}


	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum ChangeReason {
		Document,
		Codemarks
	}

	public class DidChangeDocumentMarkersNotification {
		public TextDocumentIdentifier TextDocument { get; set; }
		public ChangeReason? Reason { get; set; }
	}

	public class DidChangeDocumentMarkersNotificationType : NotificationType<DidChangeDocumentMarkersNotification> {
		public const string MethodName = "codestream/didChangeDocumentMarkers";
		public override string Method => MethodName;
	}

	//export enum VersionCompatibility
	//{
	//    Compatible = "ok",
	//    CompatibleUpgradeAvailable = "outdated",
	//    CompatibleUpgradeRecommended = "deprecated",
	//    UnsupportedUpgradeRequired = "incompatible",
	//    Unknown = "unknownVersion"
	//}

	public class DidChangeVersionCompatibilityNotification {
		public string Compatibility { get; set; }
		public string DownloadUrl { get; set; }
		public string Version { get; set; }
	}

	public class DidChangeVersionCompatibilityNotificationType : NotificationType<DidChangeVersionCompatibilityNotification> {
		private readonly JToken _token;

		public DidChangeVersionCompatibilityNotificationType(JToken token) {
			_token = token;
		}

		public const string MethodName = "codestream/didChangeVersionCompatibility";
		public override string Method => MethodName;

		public override string AsJson() {
			return CustomNotificationPayload.Create(Method, _token);
		}
	}

	public class DidLogoutNotification {
		public LogoutReason Reason { get; set; }
	}

	public class DidLogoutNotificationType : NotificationType<DidLogoutNotification> {
		public const string MethodName = "codestream/didLogout";
		public override string Method => MethodName;
	}


	public class DidLoginNotification {
		public LoginSuccessResponse Data { get; set; }
	}

	public class DidLoginNotificationType : NotificationType<DidLoginNotification> {
		public const string MethodName = "codestream/didLogin";
		public override string Method => MethodName;
	}

	public class DidStartLoginNotification { }

	public class DidStartLoginNotificationType : NotificationType<DidStartLoginNotification> {

		public const string MethodName = "codestream/didStartLogin";
		public override string Method => MethodName;
	}

	public class DidFailLoginNotification { }
	public class DidFailLoginNotificationType : NotificationType<DidFailLoginNotification> {
		public const string MethodName = "codestream/didFailLogin";
		public override string Method => MethodName;
	}

	public class OtcLoginRequest {
		[JsonProperty("code", NullValueHandling = NullValueHandling.Ignore)]
		public string Code { get; set; }
		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
		[JsonProperty("alias", NullValueHandling = NullValueHandling.Ignore)]
		public bool? Alias { get; set; }
	}

	public class RestartRequiredNotification { }

	public class RestartRequiredNotificationType : NotificationType<RestartRequiredNotification> {
		public const string MethodName = "codestream/restartRequired";
		public override string Method => MethodName;
	}

	public class DidEncounterMaintenanceModeNotification { }

	public class DidEncounterMaintenanceModeNotificationType : NotificationType<DidEncounterMaintenanceModeNotification> {
		public const string MethodName = "codestream/didEncounterMaintenanceMode";
		public override string Method => MethodName;

		private readonly JToken _token;

		public DidEncounterMaintenanceModeNotificationType(JToken token) {
			_token = token;
		}

		public override string AsJson() {
			return CustomNotificationPayload.Create(Method, _token);
		}
	}

	public class DidChangeServerUrlNotification {
		public string ServerUrl { get; set; }
	}

	public class DidChangeServerUrlNotificationType : NotificationType<DidChangeServerUrlNotification> {
		public const string MethodName = "codestream/didChangeServerUrl";
		public override string Method => MethodName;

		private readonly JToken _token;

		public DidChangeServerUrlNotificationType(JToken token) {
			_token = token;
		}

		public override string AsJson() {
			return CustomNotificationPayload.Create(Method, _token);
		}
	}

	public class EnvironmentHost {
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("publicApiUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string PublicApiUrl { get; set; }
		[JsonProperty("shortName", NullValueHandling = NullValueHandling.Ignore)]
		public string ShortName { get; set; }
	}

	public class CodeStreamEnvironmentInfo {
		[JsonProperty("environment", NullValueHandling = NullValueHandling.Ignore)]
		public string Environment { get; set; } // local, prod, onprem, unknown
		[JsonProperty("isOnPrem", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsOnPrem { get; set; }
		[JsonProperty("isProductionCloud", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsProductionCloud { get; set; }
		[JsonProperty("newRelicLandingServiceUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicLandingServiceUrl { get; set; }
		[JsonProperty("newRelicApiUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicApiUrl { get; set; }
		[JsonProperty("environmentHosts", NullValueHandling = NullValueHandling.Ignore)]
		public List<EnvironmentHost> EnvironmentHosts { get; set; }
	}

	public class DidSetEnvironmentNotificationType : NotificationType<CodeStreamEnvironmentInfo> {
		public const string MethodName = "codestream/didSetEnvironment";
		public override string Method => MethodName;

		private readonly JToken _token;

		public DidSetEnvironmentNotificationType(JToken token) {
			_token = token;
		}

		public override string AsJson() {
			return CustomNotificationPayload.Create(Method, _token);
		}
	}
}
