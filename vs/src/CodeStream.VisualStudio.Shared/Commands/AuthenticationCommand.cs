using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using CodeStream.VisualStudio.Shared.Packages;
using CodeStream.VisualStudio.Shared.Services;

#if X86
	using CodeStream.VisualStudio.Vsix.x86;
#else
	using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands {
	internal abstract class AuthenticationCommandBase : VsCommandBase
	{
		private static readonly ILogger Log = LogManager.ForContext<AuthenticationCommand>();

		private readonly IComponentModel _componentModel;
		private readonly ISessionService _sessionService;


		protected AuthenticationCommandBase(IComponentModel componentModel, ISessionService sessionService, Guid commandSet, int commandId) : base(commandSet, commandId)
		{
			_componentModel = componentModel;
			_sessionService = sessionService;
		}

		protected override void ExecuteUntyped(object parameter)
		{
			try
			{
				ThreadHelper.ThrowIfNotOnUIThread();
				var session = _componentModel.GetService<ISessionService>();
				if (session?.IsReady == true)
				{
					ThreadHelper.JoinableTaskFactory.Run(async delegate {
						await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
						var authenticationService = _componentModel.GetService<IAuthenticationService>();
						if (authenticationService != null)
						{
							await authenticationService.LogoutAsync(SessionSignedOutReason.UserSignedOutFromExtension);
						}
					});
				}
				else
				{
					var toolWindowProvider = Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
					toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid);
				}
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(AuthenticationCommand));
			}
		}

		protected override void OnBeforeQueryStatus(OleMenuCommand sender, EventArgs e)
		{
			try
			{
				ThreadHelper.ThrowIfNotOnUIThread();
				Log.Verbose(nameof(AuthenticationCommand) + " " + nameof(OnBeforeQueryStatus));
				var isReady = _sessionService?.IsReady == true;
				sender.Visible = isReady;
				
				if (isReady)
				{
					sender.Text = "Sign Out";
				}
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(AuthenticationCommand));
			}
		}


	}
	internal class AuthenticationCommand : AuthenticationCommandBase {
		public AuthenticationCommand(IComponentModel componentModel, ISessionService sessionService) 
			: base(componentModel, sessionService, PackageGuids.guidWebViewPackageCmdSet, PackageIds.AuthenticationCommandId) {
		}
	}

	internal class AuthenticationTopLevelCommand : AuthenticationCommandBase
	{
		public AuthenticationTopLevelCommand(IComponentModel componentModel, ISessionService sessionService)
			: base(componentModel, sessionService, PackageGuids.guidVSPackageCommandTopMenuCmdSet, PackageIds.CodeStreamTopLevelMenuSignOutCommand)
		{
		}
	}
}
