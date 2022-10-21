using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.UnitTests.Fakes;

using Moq;

using Newtonsoft.Json.Linq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services.MessageInterceptorServiceTests
{
	public class InterceptAndModifyTests
	{
		private readonly IMessageInterceptorService _messageInterceptorService;
		private readonly Mock<IIdeService> _mockIdeService;

		public InterceptAndModifyTests()
		{
			_mockIdeService = new Mock<IIdeService>();

			_messageInterceptorService = new MessageInterceptorService(_mockIdeService.Object);
		}

		[Fact]
		public void WebviewIpcMessage_With_No_Temp_Files_Remains_Unmodified()
		{
			var container = new JObject
			{
				{
					"uri", @"C:\Not\A\Temp\File.txt"
				}
			};

			var message = new WebviewIpcMessage("", "", container, null);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Same(container, result.Params);
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void WebviewIpcMessage_With_No_Uri_Tokens_Remains_Unmodified()
		{
			var container = new JObject
			{
				{
					"someOtherKey", @"C:\Not\A\Temp\File.txt"
				}
			};

			var message = new WebviewIpcMessage("", "", container, null);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Same(container, result.Params);
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void A_NotificationMessage_With_JToken_Params_And_No_Uri_Tokens_Remains_Unmodified()
		{
			var container = new JObject
			{
				{
					"someOtherKey", @"C:\Not\A\Temp\File.txt"
				}
			};

			var message = new FakeJTokenNotificationType(container);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equal(message.Params, result["params"]);
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void A_NotificationMessage_With_JToken_Params_And_No_Temp_Paths_Remains_Unmodified()
		{
			var container = new JObject
			{
				{
					"uri", @"C:\Not\A\Temp\File.txt"
				}
			};

			var message = new FakeJTokenNotificationType(container);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equal(message.Params, result["params"]);
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void A_NotificationMessage_With_Custom_Params_And_No_Uri_Tokens_Remains_Unmodified()
		{
			var message = new FakeNotificationType();

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equivalent(message.Params, result["params"]?.ToObject<FakeNotificationTypeParams>());
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void A_NotificationMessage_With_Custom_Params_And_No_Temp_Paths_Remains_Unmodified()
		{
			var message = new FakeNotificationTypeWithUri();

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equivalent(message.Params, result["params"]?.ToObject<FakeNotificationTypeParamsWithUri>());
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		public class FakeJTokenNotificationType : NotificationType
		{
			public FakeJTokenNotificationType(JToken @params) : base(@params)
			{
			}

			public override string Method => MethodName;
			public const string MethodName = "fake/message";
		}
	}
}
