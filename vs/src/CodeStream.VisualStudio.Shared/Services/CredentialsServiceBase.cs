using System;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Credentials;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Extensions;
using Newtonsoft.Json.Linq;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Services
{
	public abstract class CredentialsServiceBase
	{
		private static readonly ILogger Log = LogManager.ForContext<CredentialsServiceBase>();

		/// <remarks>
		/// Normally, ToUpperInvariant is better -- but we should be ok, as this is a 1-way transform
		/// >https://docs.microsoft.com/en-us/visualstudio/code-quality/ca1308-normalize-strings-to-uppercase?view=vs-2017
		/// </remarks>
		protected virtual string FormatKey(string uri, string email, string teamId = null) =>
			(
				string.IsNullOrEmpty(teamId) ? $"{uri}|{email}" : $"{uri}|{email}|{teamId}"
			).ToLowerInvariant();

		protected virtual string GetKey(string key) => $"{Application.Name}|" + key;

		protected Task<Tuple<string, string, string>> LoadAsync(
			string uri,
			string email,
			string teamId
		)
		{
			Log.Debug(nameof(LoadAsync));

			Guard.ArgumentNotNull(uri, nameof(uri));
			Guard.ArgumentNotNull(email, nameof(email));

			Tuple<string, string, string> result = null;

			try
			{
				using (var credential = Credential.Load(GetKey(FormatKey(uri, email, teamId))))
				{
					if (credential != null)
					{
						result = Tuple.Create(credential.Username, credential.Password, teamId);
						Log.Verbose(nameof(LoadAsync) + ": found");
					}
				}
			}
			catch (Exception ex)
			{
				Log.Warning(ex, "Could not load token");
			}

			return Task.FromResult(result);
		}

		protected Task<JToken> LoadJsonAsync(string uri, string email, string teamId)
		{
			Log.Debug(nameof(LoadJsonAsync));

			Guard.ArgumentNotNull(uri, nameof(uri));
			Guard.ArgumentNotNull(email, nameof(email));

			JToken result = null;

			try
			{
				using (var credential = Credential.Load(GetKey(FormatKey(uri, email, teamId))))
				{
					if (credential != null)
					{
						result = JToken.Parse(credential.Password);
						Log.Verbose(nameof(LoadJsonAsync) + ": found");
					}
				}
			}
			catch (Newtonsoft.Json.JsonReaderException ex)
			{
				Log.Warning(ex, "Could not read token");
			}
			catch (Exception ex)
			{
				Log.Error(ex, "Could not load token");
			}

			return Task.FromResult(result);
		}

		protected Task<bool> SaveAsync<T>(
			string userName,
			T secret,
			string uri,
			string email,
			string teamId
		) => SaveAsync(userName, secret.ToJson(), uri, email, teamId);

		protected Task<bool> SaveAsync(
			string userName,
			string secret,
			string uri,
			string email,
			string teamId
		)
		{
			Log.Debug(nameof(SaveAsync));

			Guard.ArgumentNotNull(uri, nameof(uri));
			Guard.ArgumentNotNull(email, nameof(email));

			try
			{
				Credential.Save(GetKey(FormatKey(uri, email, teamId)), userName, secret);
				return Task.FromResult(true);
			}
			catch (Exception ex)
			{
				Log.Warning(ex, "Could not save token");
			}

			return Task.FromResult(false);
		}

		protected bool Save(string userName, string secret, string uri, string email, string teamId)
		{
			Log.Debug(nameof(Save));

			Guard.ArgumentNotNull(uri, nameof(uri));
			Guard.ArgumentNotNull(email, nameof(email));

			try
			{
				Credential.Save(GetKey(FormatKey(uri, email, teamId)), userName, secret);
				return true;
			}
			catch (Exception ex)
			{
				Log.Warning(ex, "Could not save token");
			}

			return false;
		}

		protected Task<bool> DeleteAsync(string uri, string email, string teamId)
		{
			Log.Debug(nameof(DeleteAsync));

			Guard.ArgumentNotNull(uri, nameof(uri));
			Guard.ArgumentNotNull(email, nameof(email));

			try
			{
				Credential.Delete(GetKey(FormatKey(uri, email, teamId)));
				return Task.FromResult(true);
			}
			catch (Exception ex)
			{
				Log.Warning(ex, "Could not delete token");
			}

			return Task.FromResult(false);
		}
	}
}
