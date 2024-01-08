using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using CodeStream.VisualStudio.Core;

namespace CodeStream.VisualStudio.Shared.Models
{
	public class DidChangeSessionTokenStatusNotification
	{
		[JsonProperty("status", NullValueHandling = NullValueHandling.Ignore)]
		public string Status { get; set; }
	}

	public class DidChangeSessionTokenStatusNotificationType
		: NotificationType<DidChangeSessionTokenStatusNotification>
	{
		public DidChangeSessionTokenStatusNotificationType(
			DidChangeSessionTokenStatusNotification @params
		)
		{
			Params = @params;
		}

		public const string MethodName = "codestream/didChangeSessionTokenStatus";
		public override string Method => MethodName;
	}

	public class DidRefreshAccessTokenNotificationType
		: NotificationType<DidRefreshAccessTokenNotification>
	{
		public DidRefreshAccessTokenNotificationType(DidRefreshAccessTokenNotification @params) =>
			Params = @params;

		public const string MethodName = "codestream/didRefreshAccessToken";
		public override string Method => MethodName;
	}

	public class DidRefreshAccessTokenNotification
	{
		[JsonProperty("url", NullValueHandling = NullValueHandling.Ignore)]
		public string Url { get; set; }

		[JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
		public string Email { get; set; }

		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }

		[JsonProperty("token", NullValueHandling = NullValueHandling.Ignore)]
		public string Token { get; set; }

		[JsonProperty("tokenType", NullValueHandling = NullValueHandling.Ignore)]
		public string TokenType { get; set; }

		[JsonProperty("refreshToken", NullValueHandling = NullValueHandling.Ignore)]
		public string RefreshToken { get; set; }
	}

	public class DidChangeConnectionStatusNotification
	{
		public bool? Reset { get; set; }
		public ConnectionStatus Status { get; set; }
	}

	public class DidChangeConnectionStatusNotificationType
		: NotificationType<DidChangeConnectionStatusNotification>
	{
		public DidChangeConnectionStatusNotificationType(
			DidChangeConnectionStatusNotification @params
		) => Params = @params;

		public const string MethodName = "codestream/didChangeConnectionStatus";
		public override string Method => MethodName;
	}

	public class DidChangeUserPreferencesData
	{
		public bool? CodemarksShowPRComments { get; set; }
		public bool? CodemarksHideReviews { get; set; }
		public bool? CodemarksHideResolved { get; set; }
		public bool? CodemarksShowArchived { get; set; }
	}

	public class DidChangeUnreadsData
	{
		// there are other properties in the agent that are not mapped here
		public int TotalMentions { get; set; }
		public int TotalUnreads { get; set; }
	}

	public class DidChangeUserPreferencesEvent
	{
		public string Type { get; set; } = "preferences";
		public DidChangeUserPreferencesData Data { get; set; }
	}

	public class DidChangeUnreadsEvent
	{
		public string Type { get; set; } = "unreads";
		public DidChangeUnreadsData Data { get; set; }
	}

	public class DidChangeDataNotificationType : NotificationType
	{
		public DidChangeDataNotificationType(JToken token)
			: base(token) { }

		public const string MethodName = "codestream/didChangeData";
		public override string Method => MethodName;
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum ApiVersionCompatibility
	{
		ApiCompatible,
		ApiUpgradeRecommended,
		ApiUpgradeRequired
	}

	// not actually used -- JToken is used so we dont have to deserialze, then serialize
	public class DidChangeApiVersionCompatibilityNotification
	{
		public ApiVersionCompatibility Compatibility { get; set; }
		public string Version { get; set; }
		public CSApiCapabilities MissingCapabilities { get; set; }
	}

	public class DidChangeApiVersionCompatibilityNotificationType : NotificationType
	{
		public DidChangeApiVersionCompatibilityNotificationType(JToken token)
			: base(token) { }

		public const string MethodName = "codestream/didChangeApiVersionCompatibility";
		public override string Method => MethodName;
	}

	public class CSApiCapabilities : Dictionary<string, CSApiCapability> { }

	public class CSApiCapability
	{
		public string Description { get; set; }
		public string Url { get; set; }
		public string Version { get; set; }
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum ChangeReason
	{
		Document,
		Codemarks
	}

	public class DidChangeDocumentMarkersNotification
	{
		public TextDocumentIdentifier TextDocument { get; set; }
		public ChangeReason? Reason { get; set; }
	}

	public class DidChangeDocumentMarkersNotificationType
		: NotificationType<DidChangeDocumentMarkersNotification>
	{
		public DidChangeDocumentMarkersNotificationType(
			DidChangeDocumentMarkersNotification @params
		) => Params = @params;

		public const string MethodName = "codestream/didChangeDocumentMarkers";
		public override string Method => MethodName;
	}

	public class DidChangeVersionCompatibilityNotificationType : NotificationType
	{
		public DidChangeVersionCompatibilityNotificationType(JToken @params)
			: base(@params) { }

		public const string MethodName = "codestream/didChangeVersionCompatibility";
		public override string Method => MethodName;
	}

	public class DidLogoutNotification
	{
		public LogoutReason Reason { get; set; }
	}

	public class DidLogoutNotificationType : NotificationType<DidLogoutNotification>
	{
		public const string MethodName = "codestream/didLogout";
		public override string Method => MethodName;
	}

	public class DidLoginNotification
	{
		public LoginSuccessResponse Data { get; set; }
	}

	public class DidLoginNotificationType : NotificationType<DidLoginNotification>
	{
		public const string MethodName = "codestream/didLogin";
		public override string Method => MethodName;
	}

	public class OtcLoginRequest
	{
		[JsonProperty("code", NullValueHandling = NullValueHandling.Ignore)]
		public string Code { get; set; }

		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }

		[JsonProperty("alias", NullValueHandling = NullValueHandling.Ignore)]
		public bool? Alias { get; set; }
	}

	public class RestartRequiredNotificationType : NotificationType
	{
		public const string MethodName = "codestream/restartRequired";
		public override string Method => MethodName;

		public RestartRequiredNotificationType(JToken @params)
			: base(@params) { }
	}

	public class DidEncounterMaintenanceModeNotificationType : NotificationType
	{
		public const string MethodName = "codestream/didEncounterMaintenanceMode";
		public override string Method => MethodName;

		public DidEncounterMaintenanceModeNotificationType(JToken @params)
			: base(@params) { }
	}

	public class DidChangeServerUrlNotificationType : NotificationType
	{
		public const string MethodName = "codestream/didChangeServerUrl";
		public override string Method => MethodName;

		public DidChangeServerUrlNotificationType(JToken @params)
			: base(@params) { }
	}

	public class DidResolveStackTraceLineNotificationType : NotificationType
	{
		public const string MethodName = "codestream/nr/didResolveStackTraceLine";
		public override string Method => MethodName;

		public DidResolveStackTraceLineNotificationType(JToken @params)
			: base(@params) { }
	}

	public class EnvironmentHost
	{
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }

		[JsonProperty("publicApiUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string PublicApiUrl { get; set; }

		[JsonProperty("shortName", NullValueHandling = NullValueHandling.Ignore)]
		public string ShortName { get; set; }
	}

	public class CodeStreamEnvironmentInfo
	{
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

	public class DidSetEnvironmentNotificationType : NotificationType
	{
		public const string MethodName = "codestream/didSetEnvironment";
		public override string Method => MethodName;

		public DidSetEnvironmentNotificationType(JToken @params)
			: base(@params) { }
	}
}
