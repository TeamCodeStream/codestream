using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Services;

using EnvDTE;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Constants = CodeStream.VisualStudio.Core.Constants;

namespace CodeStream.VisualStudio.Shared.LanguageServer
{
	public class LanguageClientActivatorDummy { }

	public static class LanguageClientActivator
	{
		private static readonly ILogger Log = LogManager.ForContext<LanguageClientActivatorDummy>();

		public static async Task<bool?> ActivateAsync(DTE dte)
		{
			if (dte == null)
				return false;

			string path = null;
			try
			{
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
				path = Path.Combine(
					Path.GetDirectoryName(Assembly.GetAssembly(typeof(IBrowserService)).Location),
					$"dist/assets/{Constants.CodeStreamCodeStream}"
				);
				var window = dte.OpenFile(EnvDTE.Constants.vsViewKindCode, path);
				window.Visible = true;
				window.Close(vsSaveChanges.vsSaveChangesNo);
				Log.Debug($"{nameof(ActivateAsync)} success for {path}");
				return true;
			}
			catch (ArgumentNullException ex)
			{
				Log.Warning(ex, $"{nameof(ActivateAsync)} failed for {path}");
				return false;
			}
			catch (Exception ex)
			{
				Log.Error(ex, $"{nameof(ActivateAsync)} failed for {path}");
				return false;
			}
		}
	}
}
