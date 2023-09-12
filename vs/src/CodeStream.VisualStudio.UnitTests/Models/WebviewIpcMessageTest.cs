using Newtonsoft.Json.Linq;
using System.Collections.Generic;

using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Models
{
	public class IpcTests
	{
		[Theory]
		[InlineData("foo")]
		public void ToResponseMessageStringsTest(string payload)
		{
			var response = new WebviewIpcMessage("123", null, payload, null);
			var parsed = JToken.Parse(response.ToJson());
			Assert.True(parsed["params"].Value<string>() == payload);
		}

		[Theory]
		[InlineData(10)]
		public void ToResponseMessageNumberTest(int payload)
		{
			var response = new WebviewIpcMessage("123", null, payload.ToString(), null);
			var parsed = JToken.Parse(response.ToJson());
			Assert.True(parsed["params"].Value<int>() == payload);
		}

		[Fact]
		public void ToResponseMessageObjectTest()
		{
			var value = "value";
			var foo = new { key = value };
			var response = new WebviewIpcMessage("123", null, JObject.FromObject(foo), null);
			var parsed = JToken.Parse(response.ToJson());
			Assert.True(parsed["params"]["key"].Value<string>() == value);
		}

		[Fact]
		public void ToResponseMessageArrayTest()
		{
			var foo = new List<object> { new { test = "value1" }, new { test = "value2" } };
			var response = new WebviewIpcMessage("123", null, JArray.FromObject(foo), null);
			var parsed = JToken.Parse(response.ToJson());
			Assert.True(parsed["params"][1]["test"].Value<string>() == "value2");
		}
	}
}
