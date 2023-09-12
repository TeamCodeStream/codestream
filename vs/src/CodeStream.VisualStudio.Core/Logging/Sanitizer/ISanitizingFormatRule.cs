namespace CodeStream.VisualStudio.Core.Logging.Sanitizer
{
	public interface ISanitizingFormatRule
	{
		string Sanitize(string content);
	}
}
