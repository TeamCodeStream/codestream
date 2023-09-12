using Serilog;
using Serilog.Configuration;
using Serilog.Core;
using Serilog.Events;
using System;

namespace CodeStream.VisualStudio.Core.Logging
{
	/// <summary>
	/// Custom Serilog sink to log to the agent
	/// </summary>
	/// <remarks>See https://contrivedexample.com/2017/01/16/custom-serilog-sink-development/</remarks>
	public class CodeStreamSink : ILogEventSink
	{
		// ReSharper disable once NotAccessedField.Local
		private readonly IFormatProvider _formatProvider;

		public CodeStreamSink(IFormatProvider formatProvider)
		{
			_formatProvider = formatProvider;
		}

		public void Emit(LogEvent logEvent)
		{
			//_iCanLog.Log(logEvent.RenderMessage(_formatProvider));
		}
	}

	public static class CodeStreamSinkExtensions
	{
		public static LoggerConfiguration CodeStreamSink(
			this LoggerSinkConfiguration loggerConfiguration,
			IFormatProvider fmtProvider = null
		)
		{
			return loggerConfiguration.Sink(new CodeStreamSink(fmtProvider));
		}
	}
}
