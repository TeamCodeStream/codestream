using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace CodeStream.VisualStudio.Shared.Extensions {
	public static class JsonExtensions {
		private static JsonSerializer DefaultJsonSerializer { get; }
		private static readonly JsonSerializerSettings DefaultSerializerSettings;
		private static readonly JsonSerializerSettings DefaultFormattedSerializerSettings;
		static JsonExtensions() {
			DefaultSerializerSettings = new JsonSerializerSettings {
				ContractResolver = new CamelCasePropertyNamesContractResolver(),
				NullValueHandling = NullValueHandling.Ignore,
				Formatting = Formatting.None
			};

			DefaultJsonSerializer = JsonSerializer.Create(DefaultSerializerSettings);

			DefaultFormattedSerializerSettings = new JsonSerializerSettings {
				ContractResolver = new CamelCasePropertyNamesContractResolver(),
				NullValueHandling = NullValueHandling.Ignore,
				Formatting = Formatting.Indented
			};
		}
	 
		public static string ToJson(this object value) =>
			JsonConvert.SerializeObject(value, DefaultSerializerSettings);

		public static string ToJson(this object value, bool format) =>
			JsonConvert.SerializeObject(value, DefaultFormattedSerializerSettings);

		public static T FromJson<T>(this string value) =>
			JsonConvert.DeserializeObject<T>(value);

		public static JToken ToJToken(this object obj) =>
			JToken.FromObject(obj, DefaultJsonSerializer);

		public static JToken RemoveFields(this JToken token, params string[] fields) {
			var container = token as JContainer;
			if (container == null) return token;

			List<JToken> removeList = new List<JToken>();
			foreach (JToken el in container.Children()) {
				var p = el as JProperty;
				if (p != null && fields.Contains(p.Name)) {
					removeList.Add(el);
				}

				el.RemoveFields(fields);
			}

			foreach (JToken el in removeList) {
				el.Remove();
			}

			return token;
		}

		public static T ToObjectSafe<T>(this JToken token) {
			try {
				return token.ToObject<T>();
			}
			catch {
				return default(T);
			}
		}
	}
}
