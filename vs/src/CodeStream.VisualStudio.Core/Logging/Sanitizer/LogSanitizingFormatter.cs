using System.Collections.Generic;
using System.IO;
using Serilog.Events;
using Serilog.Formatting;

namespace CodeStream.VisualStudio.Core.Logging.Sanitizer {
	public class LogSanitizingFormatter : ITextFormatter {
		private readonly IProcessor _processor;
		private readonly IEnumerable<ISanitizingFormatRule> _sanitizingFormatRules;
		private readonly ITextFormatter _textFormatter;
		private readonly bool _sanitizeLogContent;

		/// <summary>
		/// LogSanitizingFormatter that works with .NET 4.X
		/// </summary>
		/// <param name="processor"></param>
		/// <param name="sanitizingFormatRules"></param>
		/// <param name="jsonFormatter"></param>
		/// <param name="sanitizeLogContent"></param>
		public LogSanitizingFormatter(IProcessor processor, IEnumerable<ISanitizingFormatRule> sanitizingFormatRules, ITextFormatter jsonFormatter, bool sanitizeLogContent = true) {
			_processor = processor;
			_sanitizingFormatRules = sanitizingFormatRules;
			_textFormatter = jsonFormatter;
			_sanitizeLogContent = sanitizeLogContent;
		}

		public void Format(LogEvent logEvent, TextWriter output) {
			if (_sanitizeLogContent) {
				Sanitize(logEvent, output);
			}
			else {
				_textFormatter.Format(logEvent, output);
			}
		}

		private void Sanitize(LogEvent logEvent, TextWriter output) {
			var tempTextWriter = new StringWriter();
			_textFormatter.Format(logEvent, tempTextWriter);			
			output.WriteLine(_processor.Process(tempTextWriter.GetStringBuilder().ToString(), _sanitizingFormatRules));
		}
	}
}
