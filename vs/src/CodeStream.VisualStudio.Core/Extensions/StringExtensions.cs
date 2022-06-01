using System;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace CodeStream.VisualStudio.Core.Extensions {
	public static class StringExtensions {
		private static Regex _alphaNumericPlus = new Regex(@"[^a-zA-Z0-9\s\-_]", RegexOptions.Compiled);
		private static Regex _normalizeLineEndings = new Regex(@"\r\n|\n\r|\n|\r", RegexOptions.Compiled);

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static bool IsNullOrWhiteSpace(this string s) => string.IsNullOrWhiteSpace(s);

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static bool EqualsIgnoreCase(this string one, string two) =>
			string.Equals(one, two, StringComparison.OrdinalIgnoreCase);

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static bool EndsWithIgnoreCase(this string str, string value) =>
			str?.EndsWith(value, true, CultureInfo.InvariantCulture) == true;

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static string ToFixed(this string input, int significantDigits) {
			var decimalLocation = input.LastIndexOf('.');

			return input.Substring(0, Math.Min(decimalLocation + significantDigits + 1, input.Length));
		}

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static bool AsBool(this string s) => s != null && Convert.ToBoolean(s);		

		/// <summary>
		/// Removes non-alpha numeric characters from a string (allows spaces, hyphens, underbars)
		/// </summary>
		/// <param name="str">the string</param>
		/// <returns></returns>
		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static string ToAplhaNumericPlusSafe(this string str) =>
			str.IsNullOrWhiteSpace() ?
			str :
			_alphaNumericPlus.Replace(str, string.Empty);

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static string Truncate(this string value, int maxLength, bool withEllipses = true) {
			if (string.IsNullOrWhiteSpace(value)) return value;
			return value.Length <= maxLength ? value : value.Substring(0, maxLength) + (withEllipses ? "..." : "");
		}

		[MethodImpl(MethodImplOptions.AggressiveInlining)]
		public static string NormalizeLineEndings(this string str) =>  _normalizeLineEndings.Replace(str, "\r\n");		
	}
}
