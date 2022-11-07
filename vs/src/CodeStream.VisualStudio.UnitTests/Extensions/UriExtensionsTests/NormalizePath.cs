using System;

using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions.UriExtensionsTests
{
	public class NormalizePath
	{
		[Theory]
		[InlineData("file:///c://cheese.js","c:\\cheese.js")]
		[InlineData("file:///c%3A/cheese.js","c:\\cheese.js")]
		[InlineData("file:///c://path//subfolder//cheese.js","c:\\path\\subfolder\\cheese.js")]
		[InlineData("c://path//subfolder//cheese.js","c:\\path\\subfolder\\cheese.js")]
		[InlineData("D://path//cheese.js","d:\\path\\cheese.js")]
		public void PathIsDecodedCorrectlyInUriOverload(string inputUri, string expectedResult)
		{
			var uri = new Uri(inputUri);

			var result = uri.NormalizePath();

			Assert.Equal(expectedResult, result);
		}
	}
}
