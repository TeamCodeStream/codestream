using System;
using System.ComponentModel.Composition;
using System.Linq;
using System.Runtime.InteropServices;
using CodeStream.VisualStudio.Shared;
using CodeStream.VisualStudio.Shared.Enums;
using CodeStream.VisualStudio.Shared.Exceptions;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Interfaces;
using Microsoft.VisualStudio.Settings;
using Microsoft.VisualStudio.Shell;

namespace CodeStream.VisualStudio.Services {
	[Export(typeof(IVisualStudioSettingsManager))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class VisualStudioSettingsManager : IVisualStudioSettingsManager {
		private readonly ISettingsManager _roamingSettingsManager;

		[Guid("9B164E40-C3A2-4363-9BC5-EB4039DEF653")]
		private class SVsSettingsPersistenceManager { }

		[ImportingConstructor]
		public VisualStudioSettingsManager([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			_roamingSettingsManager = serviceProvider.GetService(typeof(SVsSettingsPersistenceManager)) as ISettingsManager;
		}

		private T GetSetting<T>(VisualStudioSetting setting) {
			var attribute = setting.GetAttribute();

			var result = _roamingSettingsManager.TryGetValue(attribute.Path, out T value);

			if(result != GetValueResult.Success) {
				throw new VisualStudioSettingException(setting, result);
			};

			return value;
		}

		public bool IsCodeLevelMetricsEnabled() {
			var isCodeLevelMetricsDisabled = GetSetting<string[]>(VisualStudioSetting.CodeLensDisabledProviders)
				.Any(x => x.Equals(Constants.CodeLevelMetrics.Provider.Id));

			return IsCodeLensEnabled() && !isCodeLevelMetricsDisabled;
		}

		public bool IsCodeLensEnabled() {
			return GetSetting<bool>(VisualStudioSetting.IsCodeLensEnabled);
		}
	}
}
