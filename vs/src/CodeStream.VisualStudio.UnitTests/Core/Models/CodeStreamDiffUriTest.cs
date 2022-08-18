using CodeStream.VisualStudio.Core.Models;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Core.Models {
	
	public class CodeStreamDiffUriTest {
		[Theory]
		[InlineData(@"c:/users/foo/code/codestream/codestream-diff/2asdf/1/repoId/left/codestream-diff/foo/bar/baz1.cs", true)]
		[InlineData(@"c:\users\foo\code\codestream\codestream-diff\2asdf\1\repoId\left\codestream-diff\foo\bar\baz1.cs", true)]
		[InlineData(@"codestream-diff/2asdf/1/repoId/left/codestream-diff/foo/bar/baz1.cs", true)]
		[InlineData(@"codestream-diff/1/repoId/left/codestream-diff/foo/bar/baz1.cs", false)]
		[InlineData(@"codestream-diff://2asdf/1/repoId/left/codestream-diff/foo/bar/baz1.cs", false)]
		[InlineData("", false)]
		[InlineData(null, false)]
		public void IsTempFileTest(string filePathPart, bool expected) {			
			Assert.Equal(expected, CodeStreamDiffUri.IsTempFile(filePathPart));
		}
		
		[Theory]
		[InlineData(@"codestream-diff/reviewId/1/repoId/left/codestream-diff/foo/bar/baz1.cs", true)]
		[InlineData(@"codestream-diff/reviewId/undefined/repoId/left/codestream-diff/foo/bar/baz1.cs", true)]
		[InlineData(@"codestream-diff/1/repoId/left/codestream-diff/foo/bar/baz1.cs", false)]
		[InlineData(@"codestream-diff://2asdf/1/repoId/left/codestream-diff/foo/bar/baz1.cs", false)]
		[InlineData("", false)]
		[InlineData(null, false)]
		public void TryParseTest(string filePathPart, bool expected) {
			Assert.Equal(expected, CodeStreamDiffUri.TryParse(filePathPart, out CodeStreamDiffUri result));
		}
		
		[Theory]
		[InlineData(@"codestream-diff/reviewId/undefined/repoId/left/codestream-diff/foo/bar/baz1.cs", "foo/bar/baz1.cs", true)]
		public void TryParseFileNameTest(string filePathPart, string fileName, bool expected) {
			Assert.Equal(expected, CodeStreamDiffUri.TryParse(filePathPart, out CodeStreamDiffUri result));
			Assert.Equal(fileName, result.FileName);
		}
	}
}
