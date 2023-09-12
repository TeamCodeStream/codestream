using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions.UriExtensionsTests
{
	public class ToUri
	{
		[Fact]
		public void ToUriTest()
		{
			Assert.Equal("file:///c:/cheese.js", "file:///c%3A/cheese.js".ToUri().ToString());
		}
	}
}
