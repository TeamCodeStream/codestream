using CodeStream.VisualStudio.Core.Extensions;

using Moq;

using Newtonsoft.Json.Linq;

using System.Collections.Generic;
using System.IO;

using CodeStream.VisualStudio.Shared.Services;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services.MessageInterceptorServiceTests
{
	public class DoesMessageContainTempFiles
	{
		private readonly IMessageInterceptorService _messageInterceptorService;

		public DoesMessageContainTempFiles()
		{
			var mockIdeService = new Mock<IIdeService>();

			_messageInterceptorService = new MessageInterceptorService(mockIdeService.Object);
		}

		[Fact]
		public void JObjectsAreIgnored()
		{
			var distractor = new JObject();

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.False(result);
		}

		[Fact]
		public void JArraysAreIgnored()
		{
			var distractor = new JArray();

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.False(result);
		}


		[Fact]
		public void JPropertiesAreIgnored()
		{
			var distractor = new JProperty("");

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.False(result);
		}

		[Theory]
		[ClassData(typeof(TempFileClassData))]
		public void JValuesAreProcessed(string jValue, bool isTempFile)
		{
			var distractor = new JValue(jValue);

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.Equal(isTempFile, result);
		}

		private class TempFileClassData : TheoryData<string, bool>
		{
			public TempFileClassData()
			{
				Add(Path.Combine(UriExtensions.CodeStreamTempPath, "filename.txt"), true);
				Add(Path.Combine(@"C:\Users\Bob\AppData\Local\Temp", "filename.txt"), false);
				Add(Path.Combine(UriExtensions.CodeStreamTempPath, "subfolder1", "subfolder2", "filename.txt"), true);
				Add(Path.Combine(@"C:\Windows\Temp", "filename.txt"), false);
				Add(Path.Combine(@"C:\Windows\Temp\codestream", "filename.txt"), false);
				Add(Path.Combine(@"C:\Windows\Temp\codestream", "subfolder", "filename.txt"), false);
			}
		}
	}
}
