using System.Collections.Generic;

namespace CodeStream.VisualStudio.Core.Logging.Sanitizer
{
	public interface IProcessor
	{
		dynamic Process(dynamic jsonObject, IEnumerable<ISanitizingFormatRule> rules);
	}
}
