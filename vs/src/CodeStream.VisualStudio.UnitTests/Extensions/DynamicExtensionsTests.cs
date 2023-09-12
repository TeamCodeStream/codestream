using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions
{
	public class DynamicExtensionsTests
	{
		[Fact]
		public void ToExpandoObjectTest()
		{
			var foo = new { Header = new { Name = "foo" } };

			Assert.Equal("foo", foo.GetValue<string>("Header.Name"));
		}
	}
}
