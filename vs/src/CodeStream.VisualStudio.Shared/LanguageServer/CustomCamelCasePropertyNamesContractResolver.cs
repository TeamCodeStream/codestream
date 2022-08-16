using System;
using System.Collections.Generic;
using Newtonsoft.Json.Serialization;

namespace CodeStream.VisualStudio.Shared.LanguageServer {
	public class CustomCamelCasePropertyNamesContractResolver : CamelCasePropertyNamesContractResolver {
		private readonly HashSet<Type> _types;

		/// <summary>
		/// Types in the hashset will not have their property names camelCased
		/// </summary>
		/// <param name="types"></param>
		public CustomCamelCasePropertyNamesContractResolver(HashSet<Type> types) {
			_types = types;
		}

		protected override JsonDictionaryContract CreateDictionaryContract(Type objectType) {
			var contract = base.CreateDictionaryContract(objectType);

			if (_types?.Contains(objectType) == true) {
				contract.DictionaryKeyResolver = propertyName => propertyName;
			}

			return contract;
		}
	}
}
