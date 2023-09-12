using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.ComponentModel.Design;

using CodeStream.VisualStudio.Shared.Packages;

#if X86
using CodeStream.VisualStudio.Vsix.x86;
#else
using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands
{
	internal abstract class WebViewToggleCommandBase : VsCommandBase
	{
		private static readonly ILogger Log = LogManager.ForContext<WebViewToggleCommandBase>();

		protected WebViewToggleCommandBase(Guid commandSet, int commandId)
			: base(commandSet, commandId) { }

		protected override void ExecuteUntyped(object parameter)
		{
			ThreadHelper.ThrowIfNotOnUIThread();
			try
			{
				Log.Verbose(nameof(WebViewToggleCommand) + " " + nameof(ExecuteUntyped));

				var toolWindowProvider =
					Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
				var result = toolWindowProvider?.ToggleToolWindowVisibility(
					Guids.WebViewToolWindowGuid
				);
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(WebViewToggleCommand));
			}
		}
	}

	internal sealed class WebViewToggleCommand : WebViewToggleCommandBase
	{
		public WebViewToggleCommand()
			: base(PackageGuids.guidWebViewPackageCmdSet, PackageIds.WebViewToggleCommandId) { }
	}

	internal sealed class WebViewToggleTopLevelMenuCommand : WebViewToggleCommandBase
	{
		public WebViewToggleTopLevelMenuCommand()
			: base(
				PackageGuids.guidVSPackageCommandTopMenuCmdSet,
				PackageIds.CodeStreamTopLevelMenuToggleCommand
			) { }
	}
}
