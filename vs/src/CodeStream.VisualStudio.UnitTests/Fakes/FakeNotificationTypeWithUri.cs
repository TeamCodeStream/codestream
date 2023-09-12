using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.UnitTests.Fakes
{
	public class FakeNotificationTypeParamsWithUri
	{
		public string Uri { get; set; }
	}

	public class FakeNotificationTypeWithUri : NotificationType<FakeNotificationTypeParamsWithUri>
	{
		public override string Method => MethodName;
		public const string MethodName = "fake/message";

		public FakeNotificationTypeWithUri() =>
			Params = new FakeNotificationTypeParamsWithUri { Uri = @"C:\Not\A\Temp\File.txt" };
	}
}
