using CodeStream.VisualStudio.Shared.Services;

using Moq;

using Newtonsoft.Json.Linq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services.MessageInterceptorServiceTests
{
	public class GetUriTokens
	{
		private readonly IMessageInterceptorService _messageInterceptorService;

		public GetUriTokens()
		{
			var mockIdeService = new Mock<IIdeService>();

			_messageInterceptorService = new MessageInterceptorService(mockIdeService.Object);
		}

		[Theory]
		[InlineData("fileUri")]
		[InlineData("fileuri")]
		[InlineData("file_uri")]
		public void TokensWithUriAsSubstringOfPathAreIgnored(string tokenName)
		{
			var token = new JValue("");

			var container = new JObject { { tokenName, token } };

			var result = _messageInterceptorService.GetUriTokens(container);

			Assert.Empty(result);
		}

		[Theory]
		[InlineData("uri", true)]
		[InlineData("URI", false)]
		[InlineData("UrI", false)]
		public void TokensWithUriOfPathAreCaseSensitive(string tokenName, bool expected)
		{
			var token = new JValue("");

			var container = new JObject { { tokenName, token } };

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
