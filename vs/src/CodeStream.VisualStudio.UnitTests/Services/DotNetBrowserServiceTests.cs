using System;
using System.Collections.Generic;
using System.Threading;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Services;

using Moq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services {
	public class DotNetBrowserServiceTests {
		[Fact]
		public void DotNetBrowserServiceTest() {
			var serviceProviderMock = new Mock<IServiceProvider>();
			var httpServiceMock = new Mock<IHttpClientService>();
			var ideServiceMock = new Mock<IIdeService>();
			var eventAggregator = new EventAggregator();

			var browserService = new DotNetBrowserServiceStub(
				serviceProviderMock.Object,
				eventAggregator,
				httpServiceMock.Object,
				ideServiceMock.Object
			);

			browserService.PostMessage("lsp1", true);
			browserService.PostMessage("lsp2", true);
			browserService.PostMessage("lsp3", true);
			browserService.PostMessage("bootstrap");

			Assert.True(browserService.QueueCount > 0);
			Assert.True(browserService.QueueCount < 4);
			eventAggregator.Publish(new WebviewDidInitializeEvent());
			Thread.Sleep(1000);
			Assert.True(browserService.QueueCount == 0);
			Assert.True(browserService.Items[0] == "bootstrap");
			Assert.True(browserService.Items[1] == "lsp1");
			Assert.True(browserService.Items[2] == "lsp2");
			Assert.True(browserService.Items[3] == "lsp3");

			eventAggregator.Publish(new SessionLogoutEvent());

			Thread.Sleep(1000);
			browserService.Items.Clear();

			browserService.PostMessage("lsp1", true);
			browserService.PostMessage("lsp2", true);
			browserService.PostMessage("lsp3", true);
			browserService.PostMessage("bootstrap");

			eventAggregator.Publish(new WebviewDidInitializeEvent());
			Thread.Sleep(1000);
			Assert.True(browserService.QueueCount == 0);
			Assert.True(browserService.Items[0] == "bootstrap");
			Assert.True(browserService.Items[1] == "lsp1");
			Assert.True(browserService.Items[2] == "lsp2");
			Assert.True(browserService.Items[3] == "lsp3");

			browserService.Dispose();
		}

		[Fact]
		public void DotNetBrowserServiceNormalThenQueuedTest() {
			var serviceProviderMock = new Mock<IServiceProvider>();
			var httpServiceMock = new Mock<IHttpClientService>();
			var ideServiceMock = new Mock<IIdeService>();
			var eventAggregator = new EventAggregator();

			var browserService = new DotNetBrowserServiceStub(
				serviceProviderMock.Object,
				eventAggregator,
				httpServiceMock.Object,
				ideServiceMock.Object
			);

			browserService.PostMessage("bootstrap1");
			browserService.PostMessage("bootstrap2");
			browserService.PostMessage("lsp1", true);
			browserService.PostMessage("lsp2", true);
			browserService.PostMessage("lsp3", true);
			browserService.PostMessage("bootstrap3");
			browserService.PostMessage("bootstrap4");

			Assert.True(browserService.QueueCount > 0);
			Assert.True(browserService.QueueCount < 4);
			eventAggregator.Publish(new WebviewDidInitializeEvent());
			Thread.Sleep(1000);
			Assert.True(browserService.QueueCount == 0);
			Assert.True(browserService.Items[0] == "bootstrap1");
			Assert.True(browserService.Items[1] == "bootstrap2");
			Assert.True(browserService.Items[2] == "bootstrap3");
			Assert.True(browserService.Items[3] == "bootstrap4");
			Assert.True(browserService.Items[4] == "lsp1");
			Assert.True(browserService.Items[5] == "lsp2");
			Assert.True(browserService.Items[6] == "lsp3");

			browserService.Dispose();
		}

		[Fact]
		public void DotNetBrowserServiceNormalTest() {
			var serviceProviderMock = new Mock<IServiceProvider>();
			var httpServiceMock = new Mock<IHttpClientService>();
			var ideServiceMock = new Mock<IIdeService>();
			var eventAggregator = new EventAggregator();

			var browserService = new DotNetBrowserServiceStub(
				serviceProviderMock.Object,
				eventAggregator,
				httpServiceMock.Object,
				ideServiceMock.Object
			);

			browserService.PostMessage("bootstrap1");
			//goes through -- no queue
			Assert.True(browserService.QueueCount == 0);
			eventAggregator.Publish(new WebviewDidInitializeEvent());
			browserService.PostMessage("bootstrap2");
			//goes through -- no queue
			Assert.True(browserService.QueueCount == 0);
			eventAggregator.Publish(new SessionLogoutEvent());
			browserService.PostMessage("bootstrap3");
			Thread.Sleep(1);
			eventAggregator.Publish(new WebviewDidInitializeEvent());
			Thread.Sleep(1);
			Assert.True(browserService.QueueCount == 0);

			Assert.True(browserService.Items[0] == "bootstrap1");
			Assert.True(browserService.Items[1] == "bootstrap2");
			Assert.True(browserService.Items[2] == "bootstrap3");
			browserService.Dispose();
		}

		[Fact]
		public void DotNetBrowserServiceReloadTest() {
			var serviceProviderMock = new Mock<IServiceProvider>();
			var httpServiceMock = new Mock<IHttpClientService>();
			var ideServiceMock = new Mock<IIdeService>();
			var eventAggregator = new EventAggregator();

			var browserService = new DotNetBrowserServiceStub(
				serviceProviderMock.Object,
				eventAggregator,
				httpServiceMock.Object,
				ideServiceMock.Object
			);

			browserService.PostMessage("bootstrap1");
			Assert.True(browserService.QueueCount == 0);
			for (var i = 0; i < 200; i++) {
				browserService.PostMessage($"data{i}", true);
			}
			eventAggregator.Publish(new WebviewDidInitializeEvent());
			SpinWait.SpinUntil(() => browserService.WasReloaded, 2000);
			Assert.Equal(true, browserService.WasReloaded);
			browserService.Dispose();
		}
	}

	public class DotNetBrowserServiceStub : DotNetBrowserService {
		public List<string> Items { get; }

		public DotNetBrowserServiceStub(
			IServiceProvider serviceProvider,
			IEventAggregator eventAggregator,
			IHttpClientService httpClientService,
			IIdeService ideService
			) : base(serviceProvider, eventAggregator, httpClientService, ideService) {
			
			Items = new List<string>();
		}

		protected override void Send(string message) {
			Items.Add(message);
#if DEBUG
			Console.WriteLine($"processed:{message}");
#endif
		}

		public bool WasReloaded { get; private set; }
		public override void ReloadWebView() {
			WasReloaded = true;
		}
	}
}
