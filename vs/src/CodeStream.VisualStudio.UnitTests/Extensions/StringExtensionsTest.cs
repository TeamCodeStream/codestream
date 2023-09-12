using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions
{
	public class StringExtensionsTest
	{
		[Theory]
		[InlineData("", true)]
		[InlineData("   ", true)]
		[InlineData(null, true)]
		[InlineData("abc", false)]
		public void IsNullOrWhiteSpaceTest(string test, bool expected)
		{
			Assert.Equal(expected, test.IsNullOrWhiteSpace());
		}

		[Theory]
		[InlineData("a", "A", true)]
		[InlineData("B", "A", false)]
		public void EqualsIgnoreCaseTest(string test1, string test2, bool expected)
		{
			Assert.Equal(expected, StringExtensions.EqualsIgnoreCase(test1, test2));
		}

		[Theory]
		[InlineData("Visual Studio CommunityЯ 2019", "Visual Studio Community 2019")]
		[InlineData("Visual!@#$%^&*() Studio CommunityЯ© 2019", "Visual Studio Community 2019")]
		[InlineData("Visual Studio Community® 2019", "Visual Studio Community 2019")]
		[InlineData("!Visual+ Studio =Community® 2019?", "Visual Studio Community 2019")]
		[InlineData("Visual Studio Enterpriseя2019", "Visual Studio Enterprise2019")]
		public void ToAplhaNumericPlusTest(string test, string expected)
		{
			Assert.Equal(expected, test.ToAplhaNumericPlusSafe());
		}

		[Theory]
		[InlineData("abc", 3, "abc")]
		[InlineData("abc", 5, "abc")]
		[InlineData("abcdefghij", 3, "abc...")]
		public void TruncateTest(string test, int maxLength, string expected)
		{
			Assert.Equal(expected, test.Truncate(maxLength));
		}

		[Theory]
		[InlineData("a\nb\nc", "a\r\nb\r\nc")]
		[InlineData("a\nbc", "a\r\nbc")]
		[InlineData("a\r\nb\r\nc", "a\r\nb\r\nc")]
		public void NormalizeLineEndingsTest(string test, string expected)
		{
			Assert.Equal(expected, test.NormalizeLineEndings());
		}
	}
}
