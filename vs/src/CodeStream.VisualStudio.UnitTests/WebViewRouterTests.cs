using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using Newtonsoft.Json.Linq;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;

namespace CodeStream.VisualStudio.UnitTests {
	[TestClass]
	public class WebViewRouterTests {
		[TestMethod]
		public async Task HandleAsyncTest() {

			var browserServiceMock = new Mock<IBrowserService>();		 

			var codeStreamAgentServiceMock = new Mock<ICodeStreamAgentService>();
			var router = new WebViewRouter(
				null,
				new Mock<ICodeStreamService>().Object,
				new Mock<IWebviewUserSettingsService>().Object,				
				new Mock<ISessionService>().Object,
				codeStreamAgentServiceMock.Object,
				new Mock<ISettingsServiceFactory>().Object,
				new Mock<IEventAggregator>().Object,
				browserServiceMock.Object,
				new Mock<IIdeService>().Object,
				new Mock<IEditorService>().Object,
				new Mock<IAuthenticationServiceFactory>().Object
			);

			await router.HandleAsync(new WindowEventArgs("BOGUS"));

			string message;
			message =
				new WebviewIpcMessage(
					"123",
					ReloadWebviewRequestType.MethodName,
					JToken.Parse("{}"),
					null).AsJson();
			await router.HandleAsync(new WindowEventArgs(message));
			browserServiceMock.Verify(_ => _.ReloadWebView(), Times.Once);

			 message =
				new WebviewIpcMessage(
					"123",
					$"{IpcRoutes.Agent}/anything",
					JToken.Parse("{}"),
					null).AsJson();
			await router.HandleAsync(new WindowEventArgs(message));
			codeStreamAgentServiceMock.Verify(_ => _.SendAsync<JToken>(It.IsAny<string>(), It.IsAny<JToken>(), null), Times.Once);
		}
	}
}
