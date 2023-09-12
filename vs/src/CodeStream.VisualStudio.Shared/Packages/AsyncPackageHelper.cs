using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using CodeStream.VisualStudio.Shared.LanguageServer;

namespace CodeStream.VisualStudio.Shared.Packages
{
	public class AsyncPackageHelper
	{
		private static readonly ILogger Log = LogManager.ForContext<AsyncPackageHelper>();

		public static void InitializePackage(string typeName)
		{
			Log.Debug(
				$@"
   ___          _      __ _                            
  / __\___   __| | ___/ _\ |_ _ __ ___  __ _ _ __ ___  
 / /  / _ \ / _` |/ _ \ \| __| '__/ _ \/ _` | '_ ` _ \ 
/ /__| (_) | (_| |  __/\ \ |_| | |  __/ (_| | | | | | | {typeName}
\____/\___/ \__,_|\___\__/\__|_|  \___|\__,_|_| |_| |_|
                                                         "
			);
			Log.Information(
				"Initializing CodeStream Extension Package={Type} v{PackageVersion} in {$VisualStudioName} ({$VisualStudioVersion}) CurrentCulture={CurrentCulture} ManagedThreadId={ManagedThreadId}",
				typeName,
				Application.ExtensionVersionShort,
				Application.VisualStudioName,
				Application.VisualStudioVersionString,
				System.Threading.Thread.CurrentThread.CurrentCulture,
				System.Threading.Thread.CurrentThread.ManagedThreadId
			);
		}

		public static async System.Threading.Tasks.Task TryTriggerLspActivationAsync(ILogger log)
		{
			log.Debug($"{nameof(TryTriggerLspActivationAsync)} starting...");
			var hasActiveEditor = false;
			EnvDTE.DTE dte = null;
			try
			{
				dte = Package.GetGlobalService(typeof(EnvDTE.DTE)) as EnvDTE.DTE;
				hasActiveEditor = dte?.Documents?.Count > 0;
			}
			catch (Exception ex)
			{
				log.Warning(ex, nameof(TryTriggerLspActivationAsync));
			}
			bool? languageClientActivatorResult = null;
			if (!hasActiveEditor)
			{
				languageClientActivatorResult = await LanguageClientActivator.ActivateAsync(dte);
			}

			log.Debug(
				$"{nameof(TryTriggerLspActivationAsync)} HasActiveEditor={hasActiveEditor} LanguageClientActivatorResult={languageClientActivatorResult}"
			);
			await System.Threading.Tasks.Task.CompletedTask;
		}

		public static void InitializeLogging(TraceLevel traceLevel)
		{
			if (traceLevel == TraceLevel.Silent)
				return;

#if DEBUG
			if (traceLevel == TraceLevel.Errors || traceLevel == TraceLevel.Info)
			{
				// make the default a little more informative
				LogManager.SetTraceLevel(TraceLevel.Debug);
			}
			else
			{
				LogManager.SetTraceLevel(traceLevel);
			}
#else
			LogManager.SetTraceLevel(traceLevel);
#endif
		}
	}
}
