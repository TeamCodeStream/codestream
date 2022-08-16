using System;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Credentials;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Extensions;
using Newtonsoft.Json.Linq;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Services {
	public abstract class CredentialsServiceBase {
		private static readonly ILogger Log = LogManager.ForContext<CredentialsServiceBase>();

		/// <summary>
		/// Normally, ToUpperInvariant is better -- but we should be ok, as this is a 1-way transform
		/// </summary>
		/// <param name="keys"></param>
		/// <remarks>>https://docs.microsoft.com/en-us/visualstudio/code-quality/ca1308-normalize-strings-to-uppercase?view=vs-2017</remarks>
		/// <returns></returns>
		protected virtual string FormatKey(params string[] keys) {
			return string.Join("|", keys).ToLowerInvariant();
		}

		protected virtual string GetKey(string key) {
			return $"{Application.Name}|" + key;
		}

		protected Task<Tuple<string, string>> LoadAsync(params string[] keys) {
			if (keys == null) throw new ArgumentNullException(nameof(keys));

			Log.Debug(nameof(LoadAsync));
			Tuple<string, string> result = null;

			try {
				using (var credential = Credential.Load(GetKey(FormatKey(keys)))) {
					if (credential != null) {
						result = Tuple.Create(credential.Username, credential.Password);
						Log.Verbose(nameof(LoadAsync) + ": found");
					}
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, "Could not load token");
			}

			return Task.FromResult(result);
		}	 

		protected Task<JToken> LoadJsonAsync(params string[] keys) {
			if (keys == null) throw new ArgumentNullException(nameof(keys));

			Log.Debug(nameof(LoadAsync));
			JToken result = null;

			try {
				using (var credential = Credential.Load(GetKey(FormatKey(keys)))) {
					if (credential != null) {
						result = JToken.Parse(credential.Password);						
						Log.Verbose(nameof(LoadAsync) + ": found");
					}
				}
			}
			catch(Newtonsoft.Json.JsonReaderException ex) {
				Log.Warning(ex, "Could not read token");
			}
			catch (Exception ex) {
				Log.Error(ex, "Could not load token");
			}

			return Task.FromResult(result);
		}

		protected Task<bool> SaveAsync<T>(string userName, T secret, params string[] keys) {
			return SaveAsync(userName, secret.ToJson(), keys);
		}

		protected Task<bool> SaveAsync(string userName, string secret, params string[] keys) {
			if (keys == null) throw new ArgumentNullException(nameof(keys));

			Log.Debug(nameof(SaveAsync));

			try {
				Credential.Save(GetKey(FormatKey(keys)), userName, secret);
				return Task.FromResult(true);
			}
			catch (Exception ex) {
				Log.Warning(ex, "Could not save token");
			}

			return Task.FromResult(false);
		}

		protected bool Save(string userName, string secret, params string[] keys) {
			if (keys == null) throw new ArgumentNullException(nameof(keys));

			Log.Debug(nameof(SaveAsync));

			try {
				Credential.Save(GetKey(FormatKey(keys)), userName, secret);
				return true;
			}
			catch (Exception ex) {
				Log.Warning(ex, "Could not save token");
			}

			return false;
		}

		protected Task<bool> DeleteAsync(params string[] keys) {
			if (keys == null) throw new ArgumentNullException(nameof(keys));

			Log.Debug(nameof(DeleteAsync));

			try {
				Credential.Delete(GetKey(FormatKey(keys)));
				return Task.FromResult(true);
			}
			catch (Exception ex) {
				Log.Warning(ex, "Could not delete token");
			}

			return Task.FromResult(false);
		}
	}
}
