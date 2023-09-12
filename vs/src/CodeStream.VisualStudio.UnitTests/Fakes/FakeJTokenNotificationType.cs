using CodeStream.VisualStudio.Shared.Models;

using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.UnitTests.Fakes
{
	public class FakeJTokenNotificationType : NotificationType
	{
		public FakeJTokenNotificationType(JToken @params)
			: base(@params) { }

		public override string Method => MethodName;
		private const string MethodName = "fake/message";
	}
}
