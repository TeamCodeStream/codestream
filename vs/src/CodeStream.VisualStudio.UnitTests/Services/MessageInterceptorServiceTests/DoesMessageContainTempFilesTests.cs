using CodeStream.VisualStudio.Core.Extensions;

using Moq;

using Newtonsoft.Json.Linq;

using System.Collections.Generic;
using System.IO;

using CodeStream.VisualStudio.Shared.Services;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services.MessageInterceptorServiceTests
{
	public class DoesMessageContainTempFilesTests
	{
		private readonly IMessageInterceptorService _messageInterceptorService;

		public DoesMessageContainTempFilesTests()
		{
			var mockIdeService = new Mock<IIdeService>();

			_messageInterceptorService = new MessageInterceptorService(mockIdeService.Object);
		}

		[Fact]
		public void JObjects_Are_Ignored()
		{
			var distractor = new JObject();

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.False(result);
		}

		[Fact]
		public void JArrays_Are_Ignored()
		{
			var distractor = new JArray();

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.False(result);
		}


		[Fact]
		public void JProperties_Are_Ignored()
		{
			var distractor = new JProperty("");

			var result = _messageInterceptorService.DoesMessageContainTempFiles(new List<JToken> { distractor });

			Assert.False(result);
		}

		[Theory]
		[ClassData(typeof(TempFileClassData))]
		public void JValues_Are_Processed(string jValue, bool isTempFile)
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
