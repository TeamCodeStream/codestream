using System;

using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions.UriExtensionsTests {
	
	public class EqualsIgnoreCase {

		[Fact]
		public void EqualsIgnoreCaseTest() {
			Assert.True(new Uri("file:///c%3A/cheese.js").EqualsIgnoreCase(new Uri("file:///c:/cheese.js")));
			Assert.True(new Uri("file:///c:/cheese.js").EqualsIgnoreCase(new Uri("file:///c%3A/cheese.js")));
		}
	}
}
