using CodeStream.VisualStudio.Core.Extensions;

namespace CodeStream.VisualStudio.Core.Logging.Sanitizer
{
	public class SecretsSanitizingFormatRule : ISanitizingFormatRule
	{
		public string Sanitize(string content)
		{
			if (content.IsNullOrWhiteSpace())
				return content;

			content = RegularExpressions.ApiKeyRegex.Replace(content, @"""apiKey"":""<hidden>""$2");
			content = RegularExpressions.PasswordRegex.Replace(
				content,
				@"""password"":""<hidden>""$2"
			);
			content = RegularExpressions.TokenRegex.Replace(content, @"""token"":""<hidden>""$2");
			content = RegularExpressions.PasswordOrTokenRegex.Replace(
				content,
				@"""passwordOrToken"":""<hidden>""$2"
			);
			content = RegularExpressions.SecretRegex.Replace(content, @"""secret"":""<hidden>""$2");

			return content.TrimEnd('\r', '\n');
		}
	}
}
