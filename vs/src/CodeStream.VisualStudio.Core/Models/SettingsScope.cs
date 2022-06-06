using System;
using CodeStream.VisualStudio.Core.Services;

namespace CodeStream.VisualStudio.Core.Models {
	public class SettingsScope : IDisposable {
		public ICodeStreamSettingsManager CodeStreamSettingsManager { get; }

		private readonly bool _pauseNotifyPropertyChanged;
		private SettingsScope(ICodeStreamSettingsManager codeStreamSettingsManager, bool pauseNotifyPropertyChanged) {
			CodeStreamSettingsManager = codeStreamSettingsManager;
			_pauseNotifyPropertyChanged = pauseNotifyPropertyChanged;
		}

		private bool _disposed;

		public void Dispose() {
			Dispose(true);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed) return;

			if (disposing) {
				try {
					// attempt to save the settings to storage
					CodeStreamSettingsManager?.SaveSettingsToStorage();
				}
				finally {
					// if we're paused, attempt to un-pause
					if (_pauseNotifyPropertyChanged) {
						CodeStreamSettingsManager?.ResumeNotifications();
					}
				}
			}

			_disposed = true;
		}

		public static SettingsScope Create(ICodeStreamSettingsManager codeStreamSettingsManager, bool pauseNotifyPropertyChanged = false) {
			if (pauseNotifyPropertyChanged) {
				codeStreamSettingsManager.PauseNotifications();
			}
			return new SettingsScope(codeStreamSettingsManager, pauseNotifyPropertyChanged);
		}
	}
}
