using System;
using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions {
	
	public class UriExtensionsTests {
		[Fact]
		public void EqualsIgnoreCaseTest() {
			Assert.True(new Uri("file:///c%3A/cheese.js").EqualsIgnoreCase(new Uri("file:///c:/cheese.js")));
			Assert.True(new Uri("file:///c:/cheese.js").EqualsIgnoreCase(new Uri("file:///c%3A/cheese.js")));
		}
		[Fact]
		public void ToUriTest() {
			Assert.Equal("file:///c:/cheese.js", "file:///c%3A/cheese.js".ToUri().ToString());
		}
	}
}
