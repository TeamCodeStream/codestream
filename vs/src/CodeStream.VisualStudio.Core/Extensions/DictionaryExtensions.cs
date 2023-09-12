using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public static class DictionaryExtensions
	{
		public static bool AnySafe(this IDictionary dictionary) => dictionary?.Count > 0;

		public static string ToKeyValueString<TKey, TValue>(
			this Dictionary<TKey, TValue> dictionary
		)
		{
			return string.Join(
				",",
				dictionary
					.Select(pair => $"{pair.Key.ToString()}={pair.Value?.ToString()}")
					.ToArray()
			);
		}
	}
}
