using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Properties;
using Microsoft.VisualStudio.Shell;
using System;
using System.ComponentModel;
using System.ComponentModel.Design;
using System.Runtime.InteropServices;
using System.Threading;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.Shared.UI.Settings;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft;
using Task = System.Threading.Tasks.Task;

using System.Collections.Generic;

using CodeStream.VisualStudio.Shared.Authentication;

namespace CodeStream.VisualStudio.Shared.Packages
{
	[ProvideService(typeof(SSettingsManagerAccessor))]
	[ProvideOptionPage(typeof(OptionsDialogPage), Application.ShortName, "Settings", 0, 0, true)]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration(
		Application.FullName,
		Application.ProductionDescription,
		SolutionInfo.Version
	)]
	[Guid(Guids.CodeStreamSettingsPackageId)]
	public sealed class SettingsPackage : AsyncPackage
	{
		private IComponentModel _componentModel;
		private IOptionsDialogPage _optionsDialogPage;
		private ICodeStreamSettingsManager _codeStreamSettingsManager;

		protected override async Task InitializeAsync(
			CancellationToken cancellationToken,
			IProgress<ServiceProgressData> progress
		)
		{
			_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
			Assumes.Present(_componentModel);

			await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
			// can only get a dialog page from a package
			_optionsDialogPage = (IOptionsDialogPage)GetDialogPage(typeof(OptionsDialogPage));
			_codeStreamSettingsManager = new CodeStreamSettingsManager(_optionsDialogPage);
			((IServiceContainer)this).AddService(
				typeof(SSettingsManagerAccessor),
				CreateService,
				true
			);

			await ForceServerMigrationAsync(_componentModel);

			AsyncPackageHelper.InitializeLogging(
				_codeStreamSettingsManager.GetExtensionTraceLevel()
			);
			AsyncPackageHelper.InitializePackage(GetType().Name);
			if (_codeStreamSettingsManager?.DialogPage != null)
			{
				_codeStreamSettingsManager.DialogPage.PropertyChanged += DialogPage_PropertyChanged;
			}

			await base.InitializeAsync(cancellationToken, progress);
		}

		private async Task ForceServerMigrationAsync(IComponentModel _componentModel)
		{
			var tempUrlMap = new Dictionary<string, string>()
			{
				{
					"https://staging-api.codestream.us",
					"https://codestream-api-v2-stg.staging-service.nr-ops.net"
				},
				{
					"https://api.codestream.com",
					"https://codestream-api-v2-us1.service.newrelic.com"
				},
				{
					"https://eu-api.codestream.com",
					"https://codestream-api-v2-eu1.service.eu.newrelic.com"
				},
				{
					"https://codestream-pd.staging-service.nr-ops.net",
					"https://codestream-api-v2-pd.staging-service.nr-ops.net"
				},
				{
					"https://codestream-qa.staging-service.nr-ops.net",
					"https://codestream-api-v2-qa.staging-service.nr-ops.net"
				},
				{
					"https://codestream.eu.service.newrelic.com",
					"https://codestream-api-v2-eu1.service.eu.newrelic.com"
				},
				{
					"https://codestream-us1.service.newrelic.com",
					"https://codestream-api-v2-us1.service.newrelic.com"
				},
				{
					"https://codestream-eu1.service.eu.newrelic.com",
					"https://codestream-api-v2-eu1.service.eu.newrelic.com"
				},
				{
					"https://codestream-stg.staging-service.newrelic.com",
					"https://codestream-api-v2-stg.staging-service.nr-ops.net"
				}
			};

			if (!tempUrlMap.ContainsKey(_codeStreamSettingsManager.ServerUrl))
			{
				return;
			}

			var credentialManager = _componentModel.GetService<ICredentialManager>();
			Assumes.Present(credentialManager);

			var oldServerUrl = _codeStreamSettingsManager.ServerUrl.Trim();
			var newServerUrl = tempUrlMap[_codeStreamSettingsManager.ServerUrl];

			_codeStreamSettingsManager.ServerUrl = newServerUrl;
			_codeStreamSettingsManager.SaveSettingsToStorage();

			if (_codeStreamSettingsManager.Email != null && _codeStreamSettingsManager.Team != null)
			{
				var token = await credentialManager.GetCredentialAsync(
					oldServerUrl,
					_codeStreamSettingsManager.Email,
					_codeStreamSettingsManager.Team
				);

				if (token != null)
				{
					await credentialManager.StoreCredentialAsync(
						newServerUrl,
						_codeStreamSettingsManager.Email,
						_codeStreamSettingsManager.Team,
						token
					);
				}
			}
		}

		private void DialogPage_PropertyChanged(object sender, PropertyChangedEventArgs args)
		{
			if (_codeStreamSettingsManager == null)
			{
				return;
			}

			switch (args.PropertyName)
			{
				case nameof(_codeStreamSettingsManager.TraceLevel):
					LogManager.SetTraceLevel(_codeStreamSettingsManager.GetExtensionTraceLevel());
					break;

				case nameof(_codeStreamSettingsManager.ServerUrl):
				case nameof(_codeStreamSettingsManager.ProxyStrictSsl):
				case nameof(_codeStreamSettingsManager.ProxySupport):
				case nameof(_codeStreamSettingsManager.DisableStrictSSL):
				case nameof(_codeStreamSettingsManager.ExtraCertificates):
					try
					{
						var sessionService = _componentModel.GetService<ISessionService>();
						if (sessionService?.IsAgentReady == true || sessionService?.IsReady == true)
						{
							_ = _componentModel
								.GetService<ICodeStreamService>()
								.ConfigChangeReloadNotificationAsync();
						}
					}
					catch
					{
						// ignored
					}

					break;
			}
		}

		private object CreateService(IServiceContainer container, Type serviceType) =>
			typeof(SSettingsManagerAccessor) == serviceType
				? new SettingsManagerAccessor(_codeStreamSettingsManager)
				: null;

		protected override void Dispose(bool isDisposing)
		{
			if (isDisposing)
			{
				try
				{
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					if (_codeStreamSettingsManager?.DialogPage != null)
					{
						_codeStreamSettingsManager.DialogPage.PropertyChanged -=
							DialogPage_PropertyChanged;
					}
				}
				catch (Exception)
				{
					// ignored
				}
			}

			base.Dispose(isDisposing);
		}
	}
}
