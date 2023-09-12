using System;
using Microsoft.VisualStudio.Shell.Settings;

namespace CodeStream.VisualStudio.Shared.Providers
{
	public interface ISettingsProvider
	{
		bool TryGetString(string collectionName, string propertyName, out string value);
		void SetString(string collectionName, string propertyName, string data);
	}

	internal class ShellSettingsProvider : ISettingsProvider
	{
		private readonly IServiceProvider _serviceProvider;
		private readonly Microsoft.VisualStudio.Settings.SettingsScope _settingsScope;

		public ShellSettingsProvider(IServiceProvider serviceProvider)
		{
			_serviceProvider = serviceProvider;
			_settingsScope = Microsoft.VisualStudio.Settings.SettingsScope.UserSettings;
		}

		public virtual bool TryGetString(
			string collectionName,
			string propertyName,
			out string value
		)
		{
			if (collectionName == null || propertyName == null)
			{
				value = null;
				return false;
			}

			collectionName = collectionName.ToLowerInvariant();
			propertyName = propertyName.ToLowerInvariant();

			var settingsMgr = new ShellSettingsManager(_serviceProvider);
			var store = settingsMgr.GetReadOnlySettingsStore(_settingsScope);

			if (store.PropertyExists(collectionName, propertyName))
			{
				value = store.GetString(collectionName, propertyName);
				return true;
			}

			value = null;
			return false;
		}

		public virtual void SetString(string collectionName, string propertyName, string data)
		{
			if (collectionName == null || propertyName == null)
				return;

			collectionName = collectionName.ToLowerInvariant();
			propertyName = propertyName.ToLowerInvariant();

			var settingsMgr = new ShellSettingsManager(_serviceProvider);
			var store = settingsMgr.GetWritableSettingsStore(_settingsScope);

			if (!store.CollectionExists(collectionName))
			{
				store.CreateCollection(collectionName);
			}
			store.SetString(collectionName, propertyName, data);
		}
	}
}
