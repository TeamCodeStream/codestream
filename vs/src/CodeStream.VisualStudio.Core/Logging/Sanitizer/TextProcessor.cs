using System.Collections.Generic;

namespace CodeStream.VisualStudio.Core.Logging.Sanitizer
{
	public class TextProcessor : IProcessor
	{
		public dynamic Process(dynamic content, IEnumerable<ISanitizingFormatRule> rules)
		{
			var sanitizedContent = content.ToString();
			foreach (var sanitizingFormatRule in rules)
			{
				sanitizedContent = sanitizingFormatRule.Sanitize(sanitizedContent);
			}
			return sanitizedContent;
		}
	}
}
