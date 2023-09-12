using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models
{
	public class PasswordLoginRequest
	{
		[JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
		public string Email { get; set; }

		[JsonProperty("password", NullValueHandling = NullValueHandling.Ignore)]
		public string Password { get; set; }

		[JsonProperty("teamId", NullValueHandling = NullValueHandling.Ignore)]
		public string TeamId { get; set; }
	}

	public class PasswordLoginRequestType : RequestType<PasswordLoginRequest>
	{
		public const string MethodName = "codestream/login/password";
		public override string Method => MethodName;
	}

	public class LoginSuccessResponse { }
}
