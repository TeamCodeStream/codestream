using System;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;
using Serilog;
using Serilog.Events;

namespace CodeStream.VisualStudio.Core
{
	public class IpcLogger
	{
		public static IDisposable CriticalOperation(
			ILogger logger,
			string name,
			IAbstractMessageType message,
			bool canEnqueue = false
		)
		{
			if (logger == null || !logger.IsEnabled(LogEventLevel.Verbose))
			{
				return null;
			}

#if DEBUG
			if (Application.DeveloperOptions.MuteIpcLogs)
			{
				return null;
			}
#endif

			logger.Verbose(message.ToJson());
			return null;
		}
	}
}
