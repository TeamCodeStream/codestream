using CodeStream.VisualStudio.Shared.Enums;
using Microsoft.VisualStudio.Settings;

namespace CodeStream.VisualStudio.Shared.Interfaces {
	public interface IVisualStudioSettingsManager {
		bool IsCodeLevelMetricsEnabled();
		bool IsCodeLensEnabled();

		ISettingsSubset GetPropertyToMonitor(VisualStudioSetting setting);
	}
}
