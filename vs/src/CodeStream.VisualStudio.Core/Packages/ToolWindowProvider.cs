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
		ICodeStreamSettingsManager GetSettingsManager();
	}

	public class SettingsManagerAccessor : ISettingsManagerAccessor, SSettingsManagerAccessor {
		private readonly ICodeStreamSettingsManager _codeStreamSettingsManager;
		public SettingsManagerAccessor(ICodeStreamSettingsManager codeStreamSettingsManager) {
			_codeStreamSettingsManager = codeStreamSettingsManager;
		}
		public ICodeStreamSettingsManager GetSettingsManager() {
			return _codeStreamSettingsManager;
		}
	}
}
