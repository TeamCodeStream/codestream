using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.UnitTests.Fakes
{
	public class FakeNotificationTypeParams
	{
		public string SomeOtherKey { get; set; }
	}

	public class FakeNotificationType : NotificationType<FakeNotificationTypeParams>
	{
		public override string Method => MethodName;
		public const string MethodName = "fake/message";

		public FakeNotificationType() =>
			Params = new FakeNotificationTypeParams { SomeOtherKey = @"C:\Not\A\Temp\File.txt" };
	}
}
