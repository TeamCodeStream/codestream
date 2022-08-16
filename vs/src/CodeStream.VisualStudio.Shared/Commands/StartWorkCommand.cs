using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.Threading;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Packages;
using CodeStream.VisualStudio.Shared.Services;

#if X86
	using CodeStream.VisualStudio.Vsix.x86;
#else
	using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands {
	public class StartWorkCommand : VsCommandBase {
		private static readonly ILogger Log = LogManager.ForContext<StartWorkCommand>();
		private readonly ISessionService _sessionService;

		public StartWorkCommand(ISessionService sessionService) : base(PackageGuids.guidWebViewPackageShortcutCmdSet, PackageIds.StartWorkCommandId) {
			_sessionService = sessionService;
		}

		protected override void ExecuteUntyped(object parameter) {
			try {
				var codeStreamService = (Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel)?.GetService<ICodeStreamService>();
				if (codeStreamService == null || !codeStreamService.IsReady) return;

				var componentModel = (IComponentModel)Package.GetGlobalService(typeof(SComponentModel));				
				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
					try {
						var toolWindowProvider = Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
						if (!toolWindowProvider.IsVisible(Guids.WebViewToolWindowGuid)) {
							if (toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid) == true) {								
							}
							else {
								Log.Warning("Could not activate tool window");
							}
						}
						
						if (_sessionService.WebViewDidInitialize == true) {
							_ = StartWorkCoreAsync(componentModel, codeStreamService);
						}
						else {
							var eventAggregator = componentModel.GetService<IEventAggregator>();
							IDisposable d = null;
							d = eventAggregator.GetEvent<WebviewDidInitializeEvent>().Subscribe(e => {
								try {
									_ = StartWorkCoreAsync(componentModel, codeStreamService);
									d.Dispose();
								}
								catch (Exception ex) {
									Log.Error(ex, $"{nameof(StartWorkCommand)} event");
								}
							});
						}
					}
					catch (Exception ex) {
						Log.Error(ex, nameof(StartWorkCommand));
					}
				});
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(StartWorkCommand));
			}
		}

		private async System.Threading.Tasks.Task StartWorkCoreAsync(IComponentModel componentModel, ICodeStreamService codeStreamService) {
			try {
				string source = null;
				if (CommandSet == PackageGuids.guidWebViewPackageCodeWindowContextMenuCmdSet) {
					source = "Context Menu";
				}
				else if (CommandSet == PackageGuids.guidWebViewPackageShortcutCmdSet) {
					source = "Shortcut";
				}
				var editorService = componentModel.GetService<IEditorService>();
				var activeTextEditor = editorService.GetActiveTextEditorSelection();

				await codeStreamService.StartWorkAsync(source, activeTextEditor?.Uri,
					cancellationToken: CancellationToken.None);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(StartWorkCoreAsync));
			}
		}
	}
}
