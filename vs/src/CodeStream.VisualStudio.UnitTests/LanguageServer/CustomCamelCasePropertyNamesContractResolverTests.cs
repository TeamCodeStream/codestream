using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.LanguageServer;
using CodeStream.VisualStudio.Shared.Models;

using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.LanguageServer
{
	public class CustomCamelCasePropertyNamesContractResolverTests
	{
		[Fact]
		public void CamelCasePropertyNamesContractResolverTest()
		{
			var str = JsonConvert.SerializeObject(
				GetTelemetryRequest(),
				GetSettings(new CamelCasePropertyNamesContractResolver())
			);
			var result = str.FromJson<TelemetryRequest>();

			Assert.True(result.EventName == "Foo");
			Assert.True(result.Properties["cheese"].ToString() == "yum");
		}

		[Fact]
		public void CustomCamelCasePropertyNamesContractResolverTest()
		{
			var str = JsonConvert.SerializeObject(
				GetTelemetryRequest(),
				GetSettings(
					new CustomCamelCasePropertyNamesContractResolver(
						new HashSet<Type> { typeof(TelemetryProperties) }
					)
				)
			);
			var result = str.FromJson<TelemetryRequest>();

			Assert.True(result.EventName == "Foo");
			Assert.True(result.Properties["Cheese"].ToString() == "yum");
		}

		private TelemetryRequest GetTelemetryRequest()
		{
			var request = new TelemetryRequest
			{
				EventName = "Foo",
				Properties = new TelemetryProperties()
			};
			request.Properties["Cheese"] = "yum";
			return request;
		}

		private JsonSerializerSettings GetSettings(IContractResolver contractResolver)
		{
			return new JsonSerializerSettings
			{
				ContractResolver = contractResolver,
				NullValueHandling = NullValueHandling.Ignore
			};
		}
	}
}
