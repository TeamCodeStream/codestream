using CodeStream.VisualStudio.Shared.LanguageServer;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.LanguageServer {
	
	public class ExtensionsTest {
		[Fact]
		public void ToLspUriStringTest() {
			Assert.Equal(@"file:///c%3A/Users/xul/code/foo/OptionsSample/src/Options/BaseOptionModel.cs",
				@"C:\Users\xul\code\foo\OptionsSample\src\Options\BaseOptionModel.cs".ToLspUriString());
		}
	}
}
