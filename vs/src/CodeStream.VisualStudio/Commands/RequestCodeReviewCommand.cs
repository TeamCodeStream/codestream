using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.Vssdk.Commands;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.Threading;

namespace CodeStream.VisualStudio.Commands {
	public class RequestCodeReviewCommand : VsCommandBase {
		private static readonly ILogger Log = LogManager.ForContext<RequestCodeReviewCommand>();

		private readonly ISessionService _sessionService;
		public RequestCodeReviewCommand(ISessionService sessionService, Guid commandSet) : base(commandSet, PackageIds.RequestCodeReviewCommandId) {
			_sessionService = sessionService;
		}

		protected override void ExecuteUntyped(object parameter) {
			try {
				var componentModel = (IComponentModel)Package.GetGlobalService(typeof(SComponentModel));
				var codeStreamService = componentModel?.GetService<ICodeStreamService>();
				if (codeStreamService == null || !codeStreamService.IsReady) return;

				string source = null;
				if (CommandSet == PackageGuids.guidWebViewPackageCodeWindowContextMenuCmdSet) {
					source = "Context Menu";
				}
				else if (CommandSet == PackageGuids.guidWebViewPackageShortcutCmdSet) {
					source = "Shortcut";
				}

				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

					try {
						var toolWindowProvider = Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
						if (!toolWindowProvider.IsVisible(Guids.WebViewToolWindowGuid)) {
							if (!toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid) == true) {							 
								Log.Warning("Could not activate tool window");
							}
						}

						if (_sessionService.WebViewDidInitialize == true) {
							_ = codeStreamService.NewReviewAsync(null, source, cancellationToken: CancellationToken.None);
						}
						else {
							var eventAggregator = componentModel.GetService<IEventAggregator>();
							IDisposable d = null;
							d = eventAggregator.GetEvent<WebviewDidInitializeEvent>().Subscribe(e => {
								try {
									_ = codeStreamService.NewReviewAsync(null, source, cancellationToken: CancellationToken.None);
									d.Dispose();
								}
								catch (Exception ex) {
									Log.Error(ex, $"{nameof(RequestCodeReviewCommand)} event");
								}
							});
						}
					}
					catch (Exception ex) {
						Log.Error(ex, nameof(RequestCodeReviewCommand));
					}
				});
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(RequestCodeReviewCommand));
			}
		}

		protected override void OnBeforeQueryStatus(OleMenuCommand sender, EventArgs e) {			
			sender.Visible = _sessionService?.IsReady == true;
		}
	}
}
