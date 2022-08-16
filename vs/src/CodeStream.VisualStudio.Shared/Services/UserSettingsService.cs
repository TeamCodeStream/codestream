using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Serilog;
using System;
using System.Collections.Generic;
using CodeStream.VisualStudio.Shared.Providers;

namespace CodeStream.VisualStudio.Shared.Services {
	/// <summary>
	/// Saves settings based on the current solution file name
	/// </summary>
	public abstract class UserSettingsService {
		private readonly ISettingsProvider _settingsProvider;
		private static readonly ILogger Log = LogManager.ForContext<UserSettingsService>();
		protected UserSettingsService(IServiceProvider serviceProvider) {
			_settingsProvider = new ShellSettingsProvider(serviceProvider);
		}

		private const string CollectionName = "codestream";
		private const string PropertyFormat = "codestream.{0}";

		/// <summary>
		/// Gets data from a bucket within the codestream collection. Requires the UI thread
		/// </summary>
		/// <typeparam name="T"></typeparam>
		/// <param name="bucketName"></param>
		/// <param name="dataKey"></param>
		/// <returns></returns>
		public T TryGetValue<T>(string bucketName, string dataKey) {
			using (Log.CriticalOperation($"{nameof(TryGetValue)} BucketName={bucketName} DataKey={dataKey}")) {
				if (bucketName.IsNullOrWhiteSpace() || dataKey.IsNullOrWhiteSpace()) {
					return default(T);
				}
				try {				
					var settings = Load(bucketName);
					if (settings == null || settings.Data == null) {
						return default(T);
					}
					if (settings.Data.TryGetValue(dataKey.ToLowerInvariant(), out object value)) {

						if (value != null) {
							var str = value as string;
							if (str != null) {
								return (T)Convert.ChangeType(value, typeof(T));
							}
							var jObject = value as JObject;
							if (jObject != null) {
								var data = jObject.ToObject<T>();
#if DEBUG
								Log.Verbose($"{nameof(TryGetValue)} to {@data}");
#else
							    Log.Verbose($"{nameof(TryGetValue)} found");
#endif
								return data;
							}
						}
					}
				}
				catch (InvalidCastException ex) {
					Log.Error(ex, $"{nameof(TryGetValue)} InvalidCastException Key={dataKey}");
					return default(T);
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(TryGetValue)} Key={dataKey}");
					return default(T);
				}
				return default(T);
			}
		}

		/// <summary>
		/// Saves data to a bucket within the codestream collection. Requires the UI thread
		/// </summary>
		/// <param name="bucketName"></param>
		/// <param name="dataKey"></param>
		/// <param name="obj"></param>
		/// <returns></returns>
		public bool Save(string bucketName, string dataKey, object obj) {
			using (Log.CriticalOperation($"{nameof(Save)} BucketName={bucketName} DataKey={dataKey}")) {
				string solutionName = null;
				string propertyName = null;
				if (bucketName.IsNullOrWhiteSpace() || dataKey.IsNullOrWhiteSpace()) {
					return false;
				}
				try {
					propertyName = string.Format(PropertyFormat, bucketName).ToLowerInvariant();
					var loaded = Load(bucketName);
					if (loaded == null) {
						loaded = new UserSettings { Data = new Dictionary<string, object>() };
					}

					if (loaded.Data.ContainsKey(dataKey) && obj == null) {
						loaded.Data.Remove(dataKey);
					}
					else {
						loaded.Data[dataKey] = obj;
					}

					_settingsProvider.SetString(CollectionName, propertyName, JsonConvert.SerializeObject(loaded));
					Log.Verbose($"{nameof(Save)} to {CollectionName}:{propertyName}");

					return true;
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(Save)} Key={dataKey} SolutionName={solutionName} PropertyName={propertyName}");
				}
				return false;
			}
		}

		private UserSettings Load(string bucketName) {
			using (Log.CriticalOperation($"{nameof(Load)} BucketName={bucketName}")) {
				if (bucketName.IsNullOrWhiteSpace()) {
					return new UserSettings {
						Data = new Dictionary<string, object>()
					};
				}
				try {
					if (_settingsProvider.TryGetString(CollectionName, string.Format(PropertyFormat, bucketName),
						out string data)) {
						Log.Verbose($"{nameof(Load)} Loaded={data}");
						return JsonConvert.DeserializeObject<UserSettings>(data);
					}
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(Load));
				}

				return new UserSettings {
					Data = new Dictionary<string, object>()
				};
			}
		}
	}

	public class UserSettings {
		public Dictionary<string, object> Data { get; set; }
	}
}
