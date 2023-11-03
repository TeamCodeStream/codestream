using Microsoft.VisualStudio.Settings;
using Microsoft.VisualStudio.Shell;
using System.ComponentModel.Composition;
using System;
using System.Security.Cryptography;
using Newtonsoft.Json.Linq;
using CodeStream.VisualStudio.Shared.Extensions;
using System.Text;
using Task = System.Threading.Tasks.Task;
using CodeStream.VisualStudio.Core.Logging;

using Microsoft;

using Serilog;
using Microsoft.VisualStudio.Shell.Settings;

using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared.Authentication
{
	public interface ICredentialManager
	{
		Task DeleteCredentialAsync(string serverUrl, string email, string teamId);
		Task<JToken> GetCredentialAsync(string serverUrl, string email, string teamId);
		Task StoreCredentialAsync(string serverUrl, string email, string teamId, JToken token);
	}

	[Export(typeof(ICredentialManager))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class CredentialManager : ICredentialManager
	{
		private static readonly ILogger Log = LogManager.ForContext<CredentialManager>();

		private static readonly string CollectionName = $"{Core.Application.FullName}\\Credentials";
		private readonly WritableSettingsStore _settingsStore;

		[ImportingConstructor]
		public CredentialManager(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider
		)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			var settingsManager = new ShellSettingsManager(ServiceProvider.GlobalProvider);

			Assumes.Present(settingsManager);

			_settingsStore = settingsManager.GetWritableSettingsStore(SettingsScope.UserSettings);

			var doesCollectionExist = _settingsStore.CollectionExists(CollectionName);

			if (!doesCollectionExist)
			{
				_settingsStore.CreateCollection(CollectionName);
			}
		}

		private static string FormatKey(string serverUrl, string email, string teamId = null) =>
			string.IsNullOrEmpty(teamId)
				? $"{serverUrl}|{email}"
				: $"{serverUrl}|{email}|{teamId}".ToLowerInvariant();

		public async Task StoreCredentialAsync(
			string serverUrl,
			string email,
			string teamId,
			JToken token
		)
		{
			var usernameKey = FormatKey(serverUrl, email, teamId);

			await StoreCredentialAsync(usernameKey, token.ToJson());
		}

		private async Task StoreCredentialAsync(string usernameKey, string token)
		{
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

			try
			{
				var tokenBytes = Encoding.UTF8.GetBytes(token);

				var encryptedToken = ProtectedData.Protect(
					tokenBytes,
					null,
					DataProtectionScope.CurrentUser
				);

				var tokenBase64 = Convert.ToBase64String(encryptedToken);

				_settingsStore.SetString(CollectionName, usernameKey, tokenBase64);
			}
			catch (Exception ex)
			{
				Log.Error(ex, $"{nameof(StoreCredentialAsync)}|Unable to store credential");
			}
		}

		public async Task<JToken> GetCredentialAsync(string serverUrl, string email, string teamId)
		{
			var usernameKey = FormatKey(serverUrl, email, teamId);

			return await GetCredentialAsync(usernameKey);
		}

		private async Task<JToken> GetCredentialAsync(string usernameKey)
		{
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

			try
			{
				var tokenBase64 = _settingsStore.GetString(CollectionName, usernameKey);
				var encryptedToken = Convert.FromBase64String(tokenBase64);

				var decryptedToken = ProtectedData.Unprotect(
					encryptedToken,
					null,
					DataProtectionScope.CurrentUser
				);

				var tokenString = Encoding.UTF8.GetString(decryptedToken);

				return JToken.Parse(tokenString);
			}
			catch (Exception ex)
			{
				Log.Error(ex, $"{nameof(GetCredentialAsync)}|Unable to acquire credential");

				return null;
			}
		}

		public async Task DeleteCredentialAsync(string serverUrl, string email, string teamId)
		{
			var usernameKey = FormatKey(serverUrl, email, teamId);
			await DeleteCredentialAsync(usernameKey);
		}

		private async Task DeleteCredentialAsync(string usernameKey)
		{
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

			_settingsStore.DeleteProperty(CollectionName, usernameKey);
		}
	}
}
