using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
	public class LiveShareInviteToSessionRequest {
		public string UserId { get; set; }
	}

	public class LiveShareInviteToSessionRequestType : RequestType<LiveShareInviteToSessionRequest> {
		public const string MethodName = "host/vsls/invite";
		public override string Method => MethodName;
	}

	public class LiveShareJoinSessionRequest {
		public string Url { get; set; }
	}

	public class LiveShareJoinSessionRequestType : RequestType<LiveShareJoinSessionRequest> {
		public const string MethodName = "host/vsls/join";
		public override string Method => MethodName;
	}

	public class LiveShareStartSessionRequest {
		public string StreamId { get; set; }
		public string ThreadId { get; set; }
	}

	public class LiveShareStartSessionRequestType : RequestType<LiveShareStartSessionRequest> {
		public const string MethodName = "host/vsls/start";
		public override string Method => MethodName;
	}
}
