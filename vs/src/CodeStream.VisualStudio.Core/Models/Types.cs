using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models {
	public enum LoginResult {
		// ReSharper disable InconsistentNaming
		SUCCESS,
		INVALID_CREDENTIALS,
		TOKEN_INVALID,
		NOT_CONFIRMED,
		USER_NOT_ON_TEAM,
		UNKNOWN,
		VERSION_UNSUPPORTED
		// ReSharper restore InconsistentNaming
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum LogoutReason {
		Token,
		Unknown,
		UnsupportedVersion
	}

	public enum ProviderType {
		MSTeams,
		Slack
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum CodemarkType {
		Comment,
		Issue,
		// Obsolete
		// Bookmark,
		Question,
		// Obsolete
		// Trap,
		Link,
		Prcomment
	}

	[JsonConverter(typeof(CamelCaseStringEnumConverter))]
	public enum ConnectionStatus {
		Disconnected,
		Reconnected,
		Reconnecting,
	}

	public enum StreamType {
		channel,
		direct,
		file
	}

	//export enum MarkerNotLocatedReason
	//{
	//    MISSING_ORIGINAL_LOCATION = "missing original location",
	//    MISSING_ORIGINAL_COMMIT = "missing original commit",
	//    CODEBLOCK_DELETED = "code block deleted",
	//    UNKNOWN = "unknown"
	//}

	public static class ChangeDataType {
		public const string Codemarks = "codemarks";
		public const string MarkerLocations = "markerLocations";
		public const string Markers = "markers";
		public const string Posts = "posts";
		public const string Preferences = "preferences";
		public const string Repositories = "repos";
		public const string Streams = "streams";
		public const string Teams = "teams";
		public const string Unreads = "unreads";
		public const string Users = "users";
	}
}
