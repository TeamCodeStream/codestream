using CodeStream.VisualStudio.Core.Extensions;
using System;
using System.Text.RegularExpressions;

namespace CodeStream.VisualStudio.Core.Models {
	public class CodeStreamDiffUri {
		private static Regex Regex = new Regex(@"codestream-diff[\\/](?<reviewId>.+)[\\/](?<checkpoint>.+)[\\/](?<repoId>.+)[\\/](?<direction>.+)[\\/]codestream-diff[\\/](?<filePath>.+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
		public CodeStreamDiffUri(string reviewId, string checkpoint, string repoId, string direction, string filePath) {			
			Uri = new Uri($"codestream-diff://{reviewId}/{(checkpoint.IsNullOrWhiteSpace() ? "undefined" : checkpoint)}/{repoId}/{direction}/{filePath}");
			FileName = filePath;
		}		

		/// <summary>
		/// Relative file name that uses the filePath part of the temp file path
		/// </summary>
		public string FileName { get; }
		public Uri Uri { get; }

		public static bool IsTempFile(string filePath) =>
			!filePath.IsNullOrWhiteSpace() && Regex.Match(filePath)?.Success == true;

		public static bool TryParse(string str, out CodeStreamDiffUri csdu) {
			if (str.IsNullOrWhiteSpace()) {
				csdu = null;
				return false;
			}

			var match = Regex.Match(str);
			if (!match.Success) {
				csdu = null;
				return false;
			}
			csdu = new CodeStreamDiffUri(match.Groups["reviewId"].Value,
								match.Groups["checkpoint"].Value,
								match.Groups["repoId"].Value,
								match.Groups["direction"].Value,
								match.Groups["filePath"].Value
							);
			return true;
		}
	}
}
