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
		private ISettingsManager _settingsManager;

		protected override async System.Threading.Tasks.Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
			Assumes.Present(_componentModel);

			await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
			// can only get a dialog page from a package
			_optionsDialogPage = (IOptionsDialogPage)GetDialogPage(typeof(OptionsDialogPage));
			_settingsManager = new SettingsManager(_optionsDialogPage);
			((IServiceContainer)this).AddService(typeof(SSettingsManagerAccessor), CreateService, true);

			AsyncPackageHelper.InitializeLogging(_settingsManager.GetExtensionTraceLevel());
			AsyncPackageHelper.InitializePackage(GetType().Name);
			if (_settingsManager?.DialogPage != null) {
				_settingsManager.DialogPage.PropertyChanged += DialogPage_PropertyChanged;
			}

			await base.InitializeAsync(cancellationToken, progress);
		}

		private void DialogPage_PropertyChanged(object sender, PropertyChangedEventArgs args) {
			if (_settingsManager == null) return;

			if (args.PropertyName == nameof(_settingsManager.TraceLevel)) {
				LogManager.SetTraceLevel(_settingsManager.GetExtensionTraceLevel());
			}
			else if (args.PropertyName == nameof(_settingsManager.AutoHideMarkers)) {
				var odp = sender as OptionsDialogPage;
				if (odp == null) return;
				var eventAggregator = _componentModel.GetService<IEventAggregator>();
				eventAggregator?.Publish(new AutoHideMarkersEvent { Value = odp.AutoHideMarkers });
			}
			else if (args.PropertyName == nameof(_settingsManager.ShowAvatars) ||
				args.PropertyName == nameof(_settingsManager.ShowMarkerGlyphs)) {
				var odp = sender as OptionsDialogPage;
				if (odp == null) return;

				var configurationController = new ConfigurationController(
					_componentModel.GetService<IEventAggregator>(),
					_componentModel.GetService<IBrowserService>()
				);

				switch (args.PropertyName) {
					case nameof(_settingsManager.ShowAvatars):
						configurationController.ToggleShowAvatars(odp.ShowAvatars);
						break;
					case nameof(_settingsManager.ShowMarkerGlyphs):
						configurationController.ToggleShowMarkerGlyphs(odp.ShowMarkerGlyphs);
						break;
				}
			}
			else if (args.PropertyName == nameof(_settingsManager.GoldenSignalsInEditorFormat)) {
				_ = CodeLevelMetricsCallbackService.RefreshAllCodeLensDataPointsAsync();
			}
			else if (args.PropertyName == nameof(_settingsManager.ServerUrl) ||
					 args.PropertyName == nameof(_settingsManager.ProxyStrictSsl) ||
					 args.PropertyName == nameof(_settingsManager.ProxySupport) ||
					 args.PropertyName == nameof(_settingsManager.DisableStrictSSL) ||
					 args.PropertyName == nameof(_settingsManager.ExtraCertificates)) {

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
				return new SettingsManagerAccessor(_settingsManager);

			return null;
		}

		protected override void Dispose(bool isDisposing) {
			if (isDisposing) {
				try {
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					if (_settingsManager != null && _settingsManager.DialogPage != null) {
						_settingsManager.DialogPage.PropertyChanged -= DialogPage_PropertyChanged;
					}
				}
				catch (Exception) {

				}
			}

			base.Dispose(isDisposing);
		}
	}
}
