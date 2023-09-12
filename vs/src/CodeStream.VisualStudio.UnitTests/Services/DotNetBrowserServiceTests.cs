using System;
using System.Threading;

using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;

using Moq;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services
{
	public class DotNetBrowserServiceTests
	{
		private readonly DotNetBrowserServiceStub _browserService;
		private readonly EventAggregator _eventAggregator;

		public DotNetBrowserServiceTests()
		{
			var serviceProviderMock = new Mock<IServiceProvider>();
			var httpServiceMock = new Mock<IHttpClientService>();
			var ideServiceMock = new Mock<IIdeService>();

			ideServiceMock.Setup(x => x.GetActiveDiffEditor()).Returns(() => null);

			var messageInterceptorMock = new MessageInterceptorService(ideServiceMock.Object);

			_eventAggregator = new EventAggregator();

			_browserService = new DotNetBrowserServiceStub(
				serviceProviderMock.Object,
				_eventAggregator,
				httpServiceMock.Object,
				messageInterceptorMock
			);
		}

		[Fact]
		public void DotNetBrowserServiceTest()
		{
			_browserService.Send("lsp1", true);
			_browserService.Send("lsp2", true);
			_browserService.Send("lsp3", true);
			_browserService.Send("bootstrap1");

			Assert.True(_browserService.QueueCount == 3);
			Assert.Contains("lsp1", _browserService[0]);
			Assert.Contains("lsp2", _browserService[1]);
			Assert.Contains("lsp3", _browserService[2]);

			_eventAggregator.Publish(new WebviewDidInitializeEvent());
			_eventAggregator.Publish(new SessionLogoutEvent());
			Assert.True(_browserService.QueueCount == 0);

			_browserService.Dispose();
		}

		[Fact]
		public void DotNetBrowserServiceNormalTest()
		{
			_browserService.Send("bootstrap1");
			Assert.True(_browserService.QueueCount == 0);
			_eventAggregator.Publish(new WebviewDidInitializeEvent());

			_browserService.Send("bootstrap2");
			Assert.True(_browserService.QueueCount == 0);
			_eventAggregator.Publish(new SessionLogoutEvent());

			_browserService.Send("bootstrap3");
			Assert.True(_browserService.QueueCount == 0);
			_eventAggregator.Publish(new WebviewDidInitializeEvent());

			_browserService.Dispose();
		}

		[Fact]
		public void DotNetBrowserServiceReloadTest()
		{
			_browserService.Send("bootstrap1");
			Assert.True(_browserService.QueueCount == 0);
			for (var i = 0; i < 200; i++)
			{
				_browserService.Send($"data{i}", true);
			}

			Assert.True(_browserService.QueueCount == 200);
			Assert.Contains("data0", _browserService[0]);
			Assert.Contains("data199", _browserService[199]);

			_eventAggregator.Publish(new WebviewDidInitializeEvent());
			SpinWait.SpinUntil(() => _browserService.WasReloaded, 2000);
			Assert.Equal(true, _browserService.WasReloaded);
			_browserService.Dispose();
		}
	}

	public class DotNetBrowserServiceStub : DotNetBrowserService
	{
		public DotNetBrowserServiceStub(
			IServiceProvider serviceProvider,
			IEventAggregator eventAggregator,
			IHttpClientService httpClientService,
			IMessageInterceptorService messageInterceptor
		)
			: base(serviceProvider, eventAggregator, httpClientService, messageInterceptor) { }

		public string this[int index]
		{
			get => base.Queue.ToArray()[index];
			set => base.Queue.ToArray()[index] = value;
		}

		public void Send(string message, bool canEnqueue = false)
		{
			var notification = new StringNotification(message);
			SendInternal(notification, canEnqueue);
		}

		public bool WasReloaded { get; private set; }

		public override void ReloadWebView()
		{
			WasReloaded = true;
		}
	}

	public class StringNotification : IAbstractMessageType
	{
		public StringNotification(string methodName) => Method = methodName;

		public string Id { get; }

		[JsonProperty("method")]
		public string Method { get; }

		public JToken Error { get; set; }
	}
}
