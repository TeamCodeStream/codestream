using CodeStream.VisualStudio.Core.Enums;
using Microsoft.VisualStudio.Settings;

namespace CodeStream.VisualStudio.Shared.Interfaces {
	public interface IVisualStudioSettingsManager {
		bool IsCodeLevelMetricsEnabled(bool defaultVal = true);

		ISettingsSubset GetPropertyToMonitor(VisualStudioSetting setting);
	}
}
