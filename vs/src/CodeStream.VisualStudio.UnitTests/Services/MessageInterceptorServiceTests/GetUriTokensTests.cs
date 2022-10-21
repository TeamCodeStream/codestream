using CodeStream.VisualStudio.Shared.Services;

using Moq;

using Newtonsoft.Json.Linq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services.MessageInterceptorServiceTests
{
	public class GetUriTokensTests
	{
		private readonly IMessageInterceptorService _messageInterceptorService;

		public GetUriTokensTests()
		{
			var mockIdeService = new Mock<IIdeService>();

			_messageInterceptorService = new MessageInterceptorService(mockIdeService.Object);
		}

		[Theory]
		[InlineData("fileUri")]
		[InlineData("fileuri")]
		[InlineData("file_uri")]
		public void Tokens_With_Uri_As_Substring_Of_Path_Are_Ignored(string tokenName)
		{
			var token = new JValue("");

			var container = new JObject
			{
				{
					tokenName, token
				}
			};

			var result = _messageInterceptorService.GetUriTokens(container);

			Assert.Empty(result);
		}

		[Theory]
		[InlineData("uri", true)]
		[InlineData("URI", false)]
		[InlineData("UrI", false)]
		public void Tokens_With_Uri_Of_Path_Are_CaseSensitive(string tokenName, bool expected)
		{
			var token = new JValue("");

			var container = new JObject
			{
				{
					tokenName, token
				}
			};

			var result = _messageInterceptorService.GetUriTokens(container);

			if (expected)
			{
				Assert.Contains(token, result);
			}
			else
			{
				Assert.DoesNotContain(token, result);
			}
		}
	}
}
