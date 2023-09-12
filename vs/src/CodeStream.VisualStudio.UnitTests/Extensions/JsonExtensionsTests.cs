using CodeStream.VisualStudio.Shared.Extensions;

using Newtonsoft.Json.Linq;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions
{
	public class JsonExtensionsTests
	{
		[Fact]
		public void ToJsonTest()
		{
			var foo = new Foo { Cheese = "swiss" };
			Assert.Equal(@"{""cheese"":""swiss""}", JsonExtensions.ToJson(foo));
		}

		[Fact]
		public void ToJTokenTest()
		{
			var foo = new Foo { Cheese = "swiss" };
			var token = JsonExtensions.ToJToken(foo);
			Assert.Equal("swiss", token["cheese"].Value<string>());
			// the following asserts that the camelCase resolver is working
			Assert.Equal((object)null, token["Cheese"]);
		}

		private class Foo
		{
			public string Cheese { get; set; }
			public Bar Bar { get; set; }
		}

		// ReSharper disable once ClassNeverInstantiated.Local
		private class Bar
		{
			public string Baz { get; set; }
		}
	}
}
