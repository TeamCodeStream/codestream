using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Properties;
using CodeStream.VisualStudio.UI.Settings;
using Microsoft.VisualStudio.Shell;
using System;
using System.ComponentModel.Design;
using System.Runtime.InteropServices;
using System.Threading;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Services;

namespace CodeStream.VisualStudio.Packages {
	[ProvideService(typeof(SSettingsManagerAccessor))]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration("#110", "#112", SolutionInfo.Version, IconResourceID = 400)]
	[Guid(Guids.CodeStreamSettingsPackageId)]
	public sealed class CodeStreamPackage : AsyncPackage, IServiceContainer {
		private IOptionsDialogPage _optionsDialogPage;
		private ISettingsManager _settingsManager;

		protected override async System.Threading.Tasks.Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

			// can only get a dialog page from a package
			_optionsDialogPage = (IOptionsDialogPage)GetDialogPage(typeof(OptionsDialogPage));
			_settingsManager = new SettingsManager(_optionsDialogPage);
			((IServiceContainer)this).AddService(typeof(SSettingsManagerAccessor), CreateService, true);

			AsyncPackageHelper.InitializeLogging(_settingsManager.GetExtensionTraceLevel());
			AsyncPackageHelper.InitializePackage(GetType().Name);

			await base.InitializeAsync(cancellationToken, progress);
		}

		private object CreateService(IServiceContainer container, Type serviceType) {
			if (typeof(SSettingsManagerAccessor) == serviceType)
				return new SettingsManagerAccessor(_settingsManager);

			return null;
		}
	}
}
