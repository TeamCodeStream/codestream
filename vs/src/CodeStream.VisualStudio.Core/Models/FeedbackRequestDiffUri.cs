using CodeStream.VisualStudio.Core.Extensions;
using System;
using System.Text.RegularExpressions;

namespace CodeStream.VisualStudio.Core.Models {
	public class FeedbackRequestDiffUri {
		private static readonly Regex Regex = new Regex(@"codestream-diff[:\\/\\/](?<reviewId>.+)[\\/](?<checkpoint>.+)[\\/](?<repoId>.+)[\\/](?<direction>.+)[\\/](?<filePath>.+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

		public string FileName { get; }
		public Uri Uri { get; }

		public FeedbackRequestDiffUri(string reviewId, string checkpoint, string repoId, string direction, string filePath) {			
			Uri = new Uri($"codestream-diff://{reviewId}/{(checkpoint.IsNullOrWhiteSpace() ? "undefined" : checkpoint)}/{repoId}/{direction}/{filePath}");
			FileName = filePath;
		}

		public static bool TryParse(string str, out FeedbackRequestDiffUri frDiffUri) {
			if (str.IsNullOrWhiteSpace()) {
				frDiffUri = null;
				return false;
			}

			var match = Regex.Match(str);
			if (!match.Success) {
				frDiffUri = null;
				return false;
			}
			frDiffUri = new FeedbackRequestDiffUri(match.Groups["reviewId"].Value,
				match.Groups["checkpoint"].Value,
				match.Groups["repoId"].Value,
				match.Groups["direction"].Value,
				match.Groups["filePath"].Value
			);
			return true;
		}
	}
}
