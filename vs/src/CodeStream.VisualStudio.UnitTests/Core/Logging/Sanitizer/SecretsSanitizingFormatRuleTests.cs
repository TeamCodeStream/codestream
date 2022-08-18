using CodeStream.VisualStudio.Core.Logging.Sanitizer;
using CodeStream.VisualStudio.Shared.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Core.Logging.Sanitizer
{
    public class SecretsSanitizingFormatRuleTests
    {
        [Theory]
        [InlineData("foo", "bar", "baz")]
        [InlineData("foo", "\"bar", "\"baz")]
        [InlineData("foo", "\"bar\"", "\"baz\"")]
        public void SanitizeTest(string userName, string password, string token)
        {
            Assert.Equal(JsonExtensions.ToJson((new
            {
                userName, password = "<hidden>", token = "<hidden>",
            })), new SecretsSanitizingFormatRule().Sanitize(JsonExtensions.ToJson(new
            {
                userName, password, token,
            })));
        }
    }
}
