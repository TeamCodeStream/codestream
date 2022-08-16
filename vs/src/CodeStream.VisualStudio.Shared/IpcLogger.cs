using System;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;
using Serilog;
using Serilog.Events;

namespace CodeStream.VisualStudio.Core {
	public class IpcLogger {
	
		public static IDisposable CriticalOperation(ILogger logger, string name, IAbstractMessageType message, bool canEnqueue = false) {		
			if (logger == null || !logger.IsEnabled(LogEventLevel.Verbose)) return null;
#if DEBUG
			if (Application.DeveloperOptions.MuteIpcLogs) return null;

			// NOTE: this will add timings to these messages, but, it has a perf. impact
			//return Core.Logging.LogExtensions.CriticalOperation(logger, message.ToLoggableDictionary(name, canEnqueue));
			logger.Verbose(message.ToLoggableString());
			return null;
#else
			logger.Verbose(message.ToLoggableString());
			return null;
#endif
		}
	}
}
