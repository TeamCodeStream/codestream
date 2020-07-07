using System;
using CodeStream.VisualStudio.Core.Services;

namespace CodeStream.VisualStudio.Core.Packages {
	public interface IToolWindowProvider {
		bool? ToggleToolWindowVisibility(Guid toolWindowId);
		bool ShowToolWindowSafe(Guid toolWindowId);
		bool IsVisible(Guid toolWindowId);
	}

	public interface SToolWindowProvider { }

	public interface SSettingsManagerAccessor { }
	public interface ISettingsManagerAccessor {
		ISettingsManager GetSettingsManager();
	}

	public class SettingsManagerAccessor : ISettingsManagerAccessor, SSettingsManagerAccessor {
		private readonly ISettingsManager _settingsManager;
		public SettingsManagerAccessor(ISettingsManager settingsManager) {
			_settingsManager = settingsManager;
		}
		public ISettingsManager GetSettingsManager() {
			return _settingsManager;
		}
	}
}
