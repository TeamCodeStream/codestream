using System;
using System.IO;

using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.UnitTests.Fakes;

using Microsoft.VisualStudio.Text.Differencing;
using Microsoft.VisualStudio.Utilities;

using Moq;

using Newtonsoft.Json.Linq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services.MessageInterceptorServiceTests
{
	public class InterceptAndModify
	{
		private readonly IMessageInterceptorService _messageInterceptorService;
		private readonly Mock<IIdeService> _mockIdeService;
		private readonly Mock<IDifferenceViewer> _mockDifferenceViewer;

		public InterceptAndModify()
		{
			_mockDifferenceViewer = new Mock<IDifferenceViewer>();
			_mockIdeService = new Mock<IIdeService>();

			_mockIdeService.Setup(x => x.GetActiveDiffEditor())
				.Returns(_mockDifferenceViewer.Object);

			_messageInterceptorService = new MessageInterceptorService(_mockIdeService.Object);
		}

		[Fact]
		public void WebviewIpcMessageWithNoTempFilesRemainsUnmodified()
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
		public void WebviewIpcMessageWithNoUriTokensRemainsUnmodified()
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
		public void WebviewIpcMessageWithJTokenParamsAndRealTempPathIsModified()
		{
			var tempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created.txt23");
			var realFile = "C:\\repo\\subfolder\\real-file.txt";

			var container = new JObject
			{
				{
					"uri", tempFile
				}
			};

			var message = new WebviewIpcMessage("", "", container, null);
			var properties = new PropertyCollection();
			properties.AddProperty(PropertyNames.OverrideFileUri, realFile);
			properties.AddProperty(PropertyNames.OriginalTempFileUri, tempFile);

			_mockDifferenceViewer.Setup(x => x.Properties)
				.Returns(properties);

			var result = _messageInterceptorService.InterceptAndModify(message);
			
			Assert.Equal(result.Params["uri"], realFile);
		}

		[Fact]
		public void WebviewIpcMessageWithJTokenParamsAndRealTempPathAtDeeperLevelIsModified()
		{
			var tempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created.txt23");
			var realFile = "C:\\repo\\subfolder\\real-file.txt";

			var container = new JObject
			{
				{
					"someParam", new JObject
					{
						{
							"anotherParam", new JObject
							{
								{
									"uri", tempFile
								}
							}
						}
					}
				}
			};

			var message = new WebviewIpcMessage("", "", container, null);
			var properties = new PropertyCollection();
			properties.AddProperty(PropertyNames.OverrideFileUri, realFile);
			properties.AddProperty(PropertyNames.OriginalTempFileUri, tempFile);

			_mockDifferenceViewer.Setup(x => x.Properties)
				.Returns(properties);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equal(result.Params?["someParam"]?["anotherParam"]?["uri"], realFile);
		}

		[Fact]
		public void WebviewIpcMessageWithJTokenParamsAndRealTempPathAtDeeperLevelIsUnmodifiedIfPathsDontMatch()
		{
			var tempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created.txt23");
			var distractorTempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created-either.nr");
			var realFile = "C:\\repo\\subfolder\\real-file.txt";

			var container = new JObject
			{
				{
					"uri", tempFile
				}
			};

			var message = new WebviewIpcMessage("", "", container, null);
			var properties = new PropertyCollection();
			properties.AddProperty(PropertyNames.OverrideFileUri, realFile);
			properties.AddProperty(PropertyNames.OriginalTempFileUri, distractorTempFile);

			_mockDifferenceViewer.Setup(x => x.Properties)
				.Returns(properties);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equal(result.Params["uri"], tempFile);
		}

		[Fact]
		public void NotificationMessageWithJTokenParamsAndNoUriTokensRemainsUnmodified()
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
		public void NotificationMessageWithJTokenParamsAndNoTempPathsRemainsUnmodified()
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
		public void NotificationMessageWithCustomParamsAndNoUriTokensRemainsUnmodified()
		{
			var message = new FakeNotificationType();

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equivalent(message.Params, result["params"]?.ToObject<FakeNotificationTypeParams>());
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void NotificationMessageWithCustomParamsAndNoTempPathsRemainsUnmodified()
		{
			var message = new FakeNotificationTypeWithUri();

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equivalent(message.Params, result["params"]?.ToObject<FakeNotificationTypeParamsWithUri>());
			_mockIdeService.Verify(x => x.GetActiveDiffEditor(), Times.Never);
		}

		[Fact]
		public void NotificationMessageWithJTokenParamsAndRealTempPathIsModified()
		{
			var tempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created.txt23");
			var realFile = "C:\\repo\\subfolder\\real-file.txt";

			var container = new JObject
			{
				{
					"uri", tempFile
				}
			};

			var message = new FakeJTokenNotificationType(container);
			var properties = new PropertyCollection();
			properties.AddProperty(PropertyNames.OverrideFileUri, realFile);
			properties.AddProperty(PropertyNames.OriginalTempFileUri, tempFile);

			_mockDifferenceViewer.Setup(x => x.Properties)
				.Returns(properties);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.NotEqual(message.Params, result["params"]);
			Assert.Equal(result["params"]?["uri"], realFile);
		}

		[Fact]
		public void NotificationMessageWithJTokenParamsAndRealTempPathAtDeeperLevelIsModified()
		{
			var tempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created.txt23");
			var realFile = "C:\\repo\\subfolder\\real-file.txt";

			var container = new JObject
			{
				{
					"someParam", new JObject
					{
						{
							"anotherParam", new JObject
							{
								{
									"uri", tempFile
								}
							}
						}
					}
				}
			};

			var message = new FakeJTokenNotificationType(container);
			var properties = new PropertyCollection();
			properties.AddProperty(PropertyNames.OverrideFileUri, realFile);
			properties.AddProperty(PropertyNames.OriginalTempFileUri, tempFile);

			_mockDifferenceViewer.Setup(x => x.Properties)
				.Returns(properties);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.NotEqual(message.Params, result["params"]);
			Assert.Equal(result["params"]?["someParam"]?["anotherParam"]?["uri"], realFile);
		}

		[Fact]
		public void NotificationMessageWithJTokenParamsAndRealTempPathAtDeeperLevelIsUnmodifiedIfPathsDontMatch()
		{
			var tempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created.txt23");
			var distractorTempFile = Path.Combine(UriExtensions.CodeStreamTempPath, "some-file-that-wont-get-created-either.nr");
			var realFile = "C:\\repo\\subfolder\\real-file.txt";

			var container = new JObject
			{
				{
					"uri", tempFile
				}
			};

			var message = new FakeJTokenNotificationType(container);
			var properties = new PropertyCollection();
			properties.AddProperty(PropertyNames.OverrideFileUri, realFile);
			properties.AddProperty(PropertyNames.OriginalTempFileUri, distractorTempFile);

			_mockDifferenceViewer.Setup(x => x.Properties)
				.Returns(properties);

			var result = _messageInterceptorService.InterceptAndModify(message);

			Assert.Equal(message.Params, result["params"]);
		}
	}
}
