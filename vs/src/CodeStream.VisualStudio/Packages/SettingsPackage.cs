using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Properties;
using CodeStream.VisualStudio.UI.Settings;
using Microsoft.VisualStudio.Shell;
using System;
using System.ComponentModel;
using System.ComponentModel.Design;
using System.Runtime.InteropServices;
using System.Threading;
using CodeStream.VisualStudio.Controllers;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft;

namespace CodeStream.VisualStudio.Packages {
	[ProvideService(typeof(SSettingsManagerAccessor))]
	[ProvideOptionPage(typeof(OptionsDialogPage), "CodeStream", "Settings", 0, 0, true)]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration("#110", "#112", SolutionInfo.Version, IconResourceID = 400)]
	[Guid(Guids.CodeStreamSettingsPackageId)]
	public sealed class SettingsPackage : AsyncPackage, IServiceContainer {
		private IComponentModel _componentModel;
		private IOptionsDialogPage _optionsDialogPage;
		private ICodeStreamSettingsManager _codeStreamSettingsManager;

		protected override async System.Threading.Tasks.Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
			Assumes.Present(_componentModel);

			await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
			// can only get a dialog page from a package
			_optionsDialogPage = (IOptionsDialogPage)GetDialogPage(typeof(OptionsDialogPage));
			_codeStreamSettingsManager = new CodeStreamSettingsManager(_optionsDialogPage);
			((IServiceContainer)this).AddService(typeof(SSettingsManagerAccessor), CreateService, true);

			AsyncPackageHelper.InitializeLogging(_codeStreamSettingsManager.GetExtensionTraceLevel());
			AsyncPackageHelper.InitializePackage(GetType().Name);
			if (_codeStreamSettingsManager?.DialogPage != null) {
				_codeStreamSettingsManager.DialogPage.PropertyChanged += DialogPage_PropertyChanged;
			}

			await base.InitializeAsync(cancellationToken, progress);
		}

		private void DialogPage_PropertyChanged(object sender, PropertyChangedEventArgs args) {
			if (_codeStreamSettingsManager == null) return;

			if (args.PropertyName == nameof(_codeStreamSettingsManager.TraceLevel)) {
				LogManager.SetTraceLevel(_codeStreamSettingsManager.GetExtensionTraceLevel());
			}
			else if (args.PropertyName == nameof(_codeStreamSettingsManager.AutoHideMarkers)) {
				var odp = sender as OptionsDialogPage;
				if (odp == null) return;
				var eventAggregator = _componentModel.GetService<IEventAggregator>();
				eventAggregator?.Publish(new AutoHideMarkersEvent { Value = odp.AutoHideMarkers });
			}
			else if (args.PropertyName == nameof(_codeStreamSettingsManager.ShowAvatars) ||
				args.PropertyName == nameof(_codeStreamSettingsManager.ShowMarkerGlyphs)) {
				var odp = sender as OptionsDialogPage;
				if (odp == null) return;

				var configurationController = new ConfigurationController(
					_componentModel.GetService<IEventAggregator>(),
					_componentModel.GetService<IBrowserService>()
				);

				switch (args.PropertyName) {
					case nameof(_codeStreamSettingsManager.ShowAvatars):
						configurationController.ToggleShowAvatars(odp.ShowAvatars);
						break;
					case nameof(_codeStreamSettingsManager.ShowMarkerGlyphs):
						configurationController.ToggleShowMarkerGlyphs(odp.ShowMarkerGlyphs);
						break;
				}
			}
			else if (args.PropertyName == nameof(_codeStreamSettingsManager.GoldenSignalsInEditorFormat)) {
				_ = CodeLevelMetricsCallbackService.RefreshAllCodeLensDataPointsAsync();
			}
			else if (args.PropertyName == nameof(_codeStreamSettingsManager.ServerUrl) ||
					 args.PropertyName == nameof(_codeStreamSettingsManager.ProxyStrictSsl) ||
					 args.PropertyName == nameof(_codeStreamSettingsManager.ProxySupport) ||
					 args.PropertyName == nameof(_codeStreamSettingsManager.DisableStrictSSL) ||
					 args.PropertyName == nameof(_codeStreamSettingsManager.ExtraCertificates)) {

				try {
					var sessionService = _componentModel.GetService<ISessionService>();
					if (sessionService?.IsAgentReady == true || sessionService?.IsReady == true) {
						_ = _componentModel.GetService<ICodeStreamService>().ConfigChangeReloadNotificationAsync();
					}
				}
				catch {}
			}
		}


		private object CreateService(IServiceContainer container, Type serviceType) {
			if (typeof(SSettingsManagerAccessor) == serviceType)
				return new SettingsManagerAccessor(_codeStreamSettingsManager);

			return null;
		}

		protected override void Dispose(bool isDisposing) {
			if (isDisposing) {
				try {
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					if (_codeStreamSettingsManager != null && _codeStreamSettingsManager.DialogPage != null) {
						_codeStreamSettingsManager.DialogPage.PropertyChanged -= DialogPage_PropertyChanged;
					}
				}
				catch (Exception) {

				}
			}

			base.Dispose(isDisposing);
		}
	}
}
