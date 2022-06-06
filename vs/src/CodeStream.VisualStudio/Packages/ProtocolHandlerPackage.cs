using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.UI;
using Microsoft;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Serilog;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using Task = System.Threading.Tasks.Task;

namespace CodeStream.VisualStudio.Packages {
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration("#111", "#112", Core.Properties.SolutionInfo.Version, IconResourceID = 400)]
	[Guid(Guids.ProtocolPackagePackageId)]
	[ProvideAppCommandLine(CliSwitch, typeof(ProtocolPackage), Arguments = "1", DemandLoad = 1)] // More info https://docs.microsoft.com/en-us/visualstudio/extensibility/adding-command-line-switches
	public sealed class ProtocolPackage : AsyncPackage {

		private static readonly ILogger Log = LogManager.ForContext<ProtocolPackage>();
		private const string CliSwitch = "codestream";
		private IComponentModel _componentModel;
		private bool _processed;
		private List<IDisposable> _disposables;
		private ICodeStreamSettingsManager _codeStreamSettingsManager;


		/// <summary>
		/// From project settings this can be triggered with `/codestream codestream-vs://codestream/codemark/5d39c1c093008d247116bf94/open`
		/// </summary>
		/// <param name="cancellationToken"></param>
		/// <param name="progress"></param>
		/// <returns></returns>
		protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			try {
				AsyncPackageHelper.InitializePackage(GetType().Name);

				_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(_componentModel);
				var settingsFactory = _componentModel.GetService<ISettingsServiceFactory>();
				_codeStreamSettingsManager = settingsFactory.GetOrCreate(nameof(ProtocolPackage));
				var sessionService = _componentModel.GetService<ISessionService>();

				await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

				AsyncPackageHelper.InitializeLogging(_codeStreamSettingsManager.GetExtensionTraceLevel());

				//ensure the ToolWindow is visible
				var toolWindowProvider = GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
				toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid);

				await AsyncPackageHelper.TryTriggerLspActivationAsync(Log);
				await InfoBarProvider.InitializeAsync(this);

				if (_codeStreamSettingsManager?.AutoSignIn != true) {
					InfoBarProvider.Instance.ShowInfoBar($"Please enable {Application.Name}'s AutoSignin feature (Tools > Options > CodeStream > Settings) to open this file");
					return;
				}

				Log.Debug($"{nameof(sessionService.WebViewDidInitialize)}={sessionService.WebViewDidInitialize} {nameof(sessionService.IsReady)}={sessionService.IsReady} {nameof(sessionService.IsAgentReady)}={sessionService.IsAgentReady}");
				if (sessionService.WebViewDidInitialize == true) {
					await HandleAsync();
				}
				else {
					var eventAggregator = _componentModel.GetService<IEventAggregator>();
					_disposables = new List<IDisposable>() {
						eventAggregator.GetEvent<WebviewDidInitializeEvent>().Subscribe(e => {
							Log.Debug(nameof(WebviewDidInitializeEvent));

							ThreadHelper.JoinableTaskFactory.Run(async delegate {
								await HandleAsync();
							});
						})
					};
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(InitializeAsync));
			}
		}

		private async System.Threading.Tasks.Task HandleAsync() {
			Log.Debug(nameof(HandleAsync));

			if (_processed) return;

			await JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
			_processed = true;
			try {

				Log.Debug(nameof(InitializeAsync) + "...Starting");
				var commandLine = await GetServiceAsync(typeof(SVsAppCommandLine)) as IVsAppCommandLine;
				Assumes.Present(commandLine);
				ErrorHandler.ThrowOnFailure(commandLine.GetOption(CliSwitch, out int isPresent, out string optionValue));

				if (isPresent != 1) {
					Log.Warning($"isPresent={isPresent}");
					return;
				}

				if (optionValue.IsNullOrWhiteSpace()) {
					Log.Warning($"optionValue missing");
					return;
				}

				var browserService = _componentModel.GetService<IBrowserService>();
				if (browserService == null) {
					Log.IsNull(nameof(browserService));
					return;
				}
				Log.Debug($"Sending optionValue={optionValue}");
				_ = browserService.NotifyAsync(new HostDidReceiveRequestNotificationType() {
					Params = new HostDidReceiveRequestNotification() {
						Url = optionValue
					}
				});
				Log.Debug($"Sent optionValue={optionValue}");
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(HandleAsync));
			}
		}

		protected override void Dispose(bool isDisposing) {
			if (isDisposing) {
				try {
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					_disposables?.DisposeAll();
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(Dispose));
				}
			}

			base.Dispose(isDisposing);
		}
	}
}
