using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging.Instrumentation;
using Serilog;
using Serilog.Events;
using SerilogTimings.Extensions;
using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace CodeStream.VisualStudio.Core.Logging {
	public static class LogExtensions {
		public static IDisposable CriticalOperation(this ILogger logger, string message, LogEventLevel logEventLevel = LogEventLevel.Verbose) {
			if (logger == null || !logger.IsEnabled(logEventLevel)) return null;

			return logger.TimeOperation(message, logEventLevel);
		}

		/// <summary>
		/// Defaults to add timings only when in Verbose mode
		/// </summary>
		/// <param name="logger"></param>
		/// <param name="message"></param>
		/// <param name="logEventLevel"></param>
		/// <returns></returns>
		public static IDisposable CriticalOperation(this ILogger logger, Dictionary<string, object> message, LogEventLevel logEventLevel = LogEventLevel.Verbose) {
			if (logger == null || !logger.IsEnabled(logEventLevel)) return null;

			return logger.TimeOperation(message.ToKeyValueString(), logEventLevel);
		}

		static IDisposable TimeOperation(this ILogger log, string message, LogEventLevel logEventLevel = LogEventLevel.Verbose) {
			return log.OperationAt(logEventLevel).Time(message);
		}

		public static bool IsDebugEnabled(this ILogger log) => log.IsEnabled(LogEventLevel.Debug);

		public static bool IsInformationEnabled(this ILogger log) => log.IsEnabled(LogEventLevel.Information);

		public static bool IsVerboseEnabled(this ILogger log) => log.IsEnabled(LogEventLevel.Verbose);

		public static IMetricsBase WithMetrics(this ILogger log, string message) {
			if (!log.IsVerboseEnabled()) return EmptyMetrics.Instance;

			return new MetricsStarter(log, $"{message}", Guid.NewGuid().ToString("n"));
		}

		[Conditional("DEBUG")]
		public static void LocalWarning(this ILogger logger, string message) {
			logger.Warning($"LOCAL=>{message}");
		}

		public static void Ctor(this ILogger logger, string message = null) {
			logger.Debug($"ctor {message}");
		}

		public static void IsNull(this ILogger logger, string message) {
			logger.Warning($"{message} is null");
		}

#if DEBUG
		public static void DebugWithCaller(this ILogger logger, string message, string callerFilePath, long callerLineNumber, string callerMember) {
			if (!callerFilePath.IsNullOrWhiteSpace()) {
				callerFilePath = System.IO.Path.GetFileName(callerFilePath);
			}

			logger.Debug($"{message} from {callerFilePath}:{callerLineNumber} {callerMember}");
		}
#endif
	}
}
