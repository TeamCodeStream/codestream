using System.Text.RegularExpressions;

namespace CodeStream.VisualStudio.Core
{
	public static class RegularExpressions
	{
		public static readonly Regex LiveShareUrl = new Regex(
			@"https:\/\/(?:.*?\.)?liveshare\.vsengsaas\.visualstudio\.com\/join\?",
			RegexOptions.Compiled | RegexOptions.IgnoreCase
		);

		public static Regex Number = new Regex(@"^\d+$", RegexOptions.Compiled);

		public static readonly Regex ApiKeyRegex = new Regex(
			@"""apiKey"":""(.*?)""(,|(?=\}))",
			RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace
		);

		public static readonly Regex PasswordRegex = new Regex(
			@"""password"":""(.*?)""(,|(?=\}))",
			RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace
		);

		public static readonly Regex TokenRegex = new Regex(
			@"""token"":""(.*?)""(,|(?=\}))",
			RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace
		);

		public static readonly Regex SecretRegex = new Regex(
			@"""secret"":""(.*?)""(,|(?=\}))",
			RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace
		);

		public static readonly Regex PasswordOrTokenRegex = new Regex(
			@"""passwordOrToken"":""(.*?)""(,|(?=\}))",
			RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace
		);

		public static readonly Regex EnvironmentRegex = new Regex(
			@"https?:\/\/((?:(\w+)-)?api|localhost)\.codestream\.(?:us|com)(?::\d+$)?",
			RegexOptions.IgnoreCase | RegexOptions.Compiled
		);
	}
}
