using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Logging;
using EnvDTE;
using Microsoft;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Serilog;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared.LanguageServer;
using CodeStream.VisualStudio.Shared.UI.ToolWindows;
using Task = System.Threading.Tasks.Task;
using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.Packages {
	[Guid(Guids.CodeStreamWebViewPackageId)]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[ProvideToolWindow(typeof(WebViewToolWindowPane), Orientation = ToolWindowOrientation.Right,
		Window = EnvDTE.Constants.vsWindowKindSolutionExplorer,
		Style = VsDockStyle.Tabbed)]
	[ProvideToolWindowVisibility(typeof(WebViewToolWindowPane), UIContextGuids.NoSolution)]
	[ProvideToolWindowVisibility(typeof(WebViewToolWindowPane), UIContextGuids.EmptySolution)]
	[ProvideToolWindowVisibility(typeof(WebViewToolWindowPane), UIContextGuids.SolutionExists)]
	[ProvideToolWindowVisibility(typeof(WebViewToolWindowPane), UIContextGuids.SolutionHasMultipleProjects)]
	[ProvideToolWindowVisibility(typeof(WebViewToolWindowPane), UIContextGuids.SolutionHasSingleProject)]
	[SuppressMessage("StyleCop.CSharp.DocumentationRules", "SA1650:ElementDocumentationMustBeSpelledCorrectly", Justification = "pkgdef, VS and vsixmanifest are valid VS terms")]
	public sealed class WebViewPackage : AsyncPackage {
		private static readonly ILogger Log = LogManager.ForContext<WebViewPackage>();

		private IComponentModel _componentModel;
		private ISolutionEventsListener _solutionEventListener;
		private IThemeEventsListener _themeEventsService;

		//public WebViewPackage() {
		//	OptionsDialogPage = GetDialogPage(typeof(OptionsDialogPage)) as OptionsDialogPage;
		//}

		//protected override int QueryClose(out bool pfCanClose)
		//{
		//    pfCanClose = true;
		//    // ReSharper disable once ConditionIsAlwaysTrueOrFalse
		//    if (pfCanClose)
		//    {
		//    }
		//    return VSConstants.S_OK;
		//}

		/// <summary>
		/// Initialization of the package; this method is called right after the package is sited, so this is the place
		/// where you can put all the initialization code that rely on services provided by VisualStudio.
		/// </summary>
		/// <param name="cancellationToken">A cancellation token to monitor for initialization cancellation, which can occur when VS is shutting down.</param>
		/// <param name="progress">A provider for progress updates.</param>
		/// <returns>A task representing the async work of package initialization, or an already completed task if there is none. Do not return null from this method.</returns>
		protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			try {
				_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(_componentModel);

				await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

				_solutionEventListener = _componentModel.GetService<ISolutionEventsListener>();
				_solutionEventListener.Opened += SolutionOrFolder_Opened;
				_solutionEventListener.Closed += SolutionOrFolder_Closed;
				_solutionEventListener.Loaded += SolutionOrFolder_Loaded;

				_themeEventsService = _componentModel.GetService<IThemeEventsListener>();
				_themeEventsService.ThemeChangedEventHandler += Theme_Changed;

				var manager = _componentModel.GetService<ISettingsServiceFactory>()?.GetOrCreate(nameof(WebViewPackage));
				if (manager != null) {
					AsyncPackageHelper.InitializeLogging(manager.GetExtensionTraceLevel());
				}

				AsyncPackageHelper.InitializePackage(GetType().Name);

				await base.InitializeAsync(cancellationToken, progress);

				var isSolutionLoaded = await IsSolutionLoadedAsync();
				Log.Debug($"{nameof(isSolutionLoaded)}={isSolutionLoaded}");
				if (isSolutionLoaded) {
					await JoinableTaskFactory.RunAsync(VsTaskRunContext.UIThreadNormalPriority,
						() => AsyncPackageHelper.TryTriggerLspActivationAsync(Log));
				}

				Log.Debug($"{nameof(WebViewPackage)} {nameof(InitializeAsync)} completed");
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(InitializeAsync));
			}
		}

		private void SolutionOrFolder_Loaded(object sender, EventArgs e) {
			var sessionService = _componentModel?.GetService<ISessionService>();
			if (sessionService == null) {
				Log.IsNull(nameof(sessionService));
				return;
			}

			if (sessionService.ProjectType == ProjectType.Solution) {
				Log.Debug($"About to {nameof(TryTriggerLspActivationAsync)} for {sessionService.ProjectType}...");
				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					await TryTriggerLspActivationAsync();
				});
			}
			else {
				Log.Debug($"Skipped {nameof(TryTriggerLspActivationAsync)} for {sessionService.ProjectType}");
			}
		}

		private void Theme_Changed(object sender, ThemeChangedEventArgs e) {
			try {
				Log.Information(nameof(Theme_Changed));
				var browserService = _componentModel?.GetService<IBrowserService>();
				if (browserService == null) {
					Log.IsNull(nameof(browserService));
					return;
				}

				browserService?.ReloadWebView();
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(Theme_Changed));
			}
		}

		private void SolutionOrFolder_Closed(object sender, HostClosedEventArgs e) {
			Log.Information($"{nameof(SolutionOrFolder_Closed)}");

			var sessionService = _componentModel?.GetService<ISessionService>();
			if (sessionService == null) {
				Log.IsNull(nameof(sessionService));
				return;
			}

			sessionService.SolutionName = null;
			sessionService.ProjectType = null;
		}

		private void SolutionOrFolder_Opened(object sender, HostOpenedEventArgs e) {
			try {
				if (Log.IsDebugEnabled()) {
					Log.Debug($"{nameof(SolutionOrFolder_Opened)} ProjectType={e.ProjectType} FileName={e.FileName}");
				}
				else {
					Log.Information($"{nameof(SolutionOrFolder_Opened)}  ProjectType={e.ProjectType}");
				}

				var sessionService = _componentModel?.GetService<ISessionService>();
				if (sessionService == null) {
					Log.IsNull(nameof(sessionService));
					return;
				}

				sessionService.SolutionName = e.FileName;
				sessionService.ProjectType = e.ProjectType;
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(SolutionOrFolder_Opened));
			}
		}

		/// <summary>
		/// Checks if a solution is open
		/// </summary>
		/// <returns></returns>
		/// <remarks>https://github.com/Microsoft/VSSDK-Extensibility-Samples/blob/master/SolutionLoadEvents/src/VSPackage.cs</remarks>
		private async Task<bool> IsSolutionLoadedAsync() {
			await JoinableTaskFactory.SwitchToMainThreadAsync();
			var solService = await GetServiceAsync(typeof(SVsSolution)) as IVsSolution;
			if (solService == null) return false;
			ErrorHandler.ThrowOnFailure(solService.GetProperty((int)__VSPROPID.VSPROPID_IsSolutionOpen, out object value));
			return value is bool isSolOpen && isSolOpen;
		}

		/// <summary>
		/// Checks if there are any active documents open -- if not tries to open/close a magic document to trigger LSP activation
		/// </summary>
		/// <returns></returns>
		private async Task TryTriggerLspActivationAsync() {
			Log.Debug($"{nameof(TryTriggerLspActivationAsync)} starting...");
			var hasActiveEditor = false;
			DTE dte = null;
			try {
				await JoinableTaskFactory.SwitchToMainThreadAsync();
				dte = GetGlobalService(typeof(DTE)) as DTE;
				hasActiveEditor = dte?.Documents?.Count > 0;
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(TryTriggerLspActivationAsync));
			}
			bool? languageClientActivatorResult = null;
			if (!hasActiveEditor) {
				languageClientActivatorResult = await LanguageClientActivator.ActivateAsync(dte);
			}

			Log.Debug($"{nameof(TryTriggerLspActivationAsync)} HasActiveEditor={hasActiveEditor} LanguageClientActivatorResult={languageClientActivatorResult}");
			await System.Threading.Tasks.Task.CompletedTask;
		}

		protected override void Dispose(bool isDisposing) {
			if (isDisposing) {
				try {
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					if (_solutionEventListener != null) {
						_solutionEventListener.Opened -= SolutionOrFolder_Opened;
						_solutionEventListener.Closed -= SolutionOrFolder_Closed;
						_solutionEventListener.Loaded -= SolutionOrFolder_Loaded;
					}
					if (_themeEventsService != null) {
						_themeEventsService.ThemeChangedEventHandler -= Theme_Changed;
					}

					//can't do this anymore... though at this point the process is exiting so why bother?...
					//Client.Instance?.Dispose();
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(Dispose));
				}
			}

			base.Dispose(isDisposing);
		}
	}
}
