using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Newtonsoft.Json;
using Serilog;
using System;
using System.ComponentModel.Composition;
using System.Net;
using System.Net.Http;
using CodeStream.VisualStudio.Core.Exceptions;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(IHttpClientService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class HttpClientService : IHttpClientService {
		private static readonly ILogger Log = LogManager.ForContext<HttpClientService>();

		private readonly ISettingsServiceFactory _settingsServiceFactory;
		private NREnvironmentSettings _nrEnvironmentSettings;

		[ImportingConstructor]
		public HttpClientService(ISettingsServiceFactory settingsServiceFactory) {
			_settingsServiceFactory = settingsServiceFactory;
		}

		/// <summary>
		/// Gets the settings from the API for enabling telemetry in the agent
		/// </summary>
		public NREnvironmentSettings GetNREnvironmentSettings() {
			if (_nrEnvironmentSettings != null) {
				return _nrEnvironmentSettings;
			}

			try {
				var settingsManager = _settingsServiceFactory.GetOrCreate(nameof(HttpClientService));
				var handler = new HttpClientHandler();

				if (settingsManager.ProxySupport == ProxySupport.Off || settingsManager.Proxy == null) {
					handler.UseProxy = false;
				}
				else {
					handler.UseProxy = true;
					handler.Proxy = new WebProxy(
						settingsManager.Proxy.Url
					);
				}

				var client = HttpClientFactory.Create(handler);
				client.DefaultRequestHeaders.Add("X-CS-Plugin-IDE", settingsManager.GetIdeInfo().Name);
				client.BaseAddress = new Uri(settingsManager.ServerUrl);

				Log.Information("Calling API for Ingest Keys");
				var response = client.GetStringAsync("no-auth/nr-ingest-key").GetAwaiter().GetResult();
				Log.Information("Ingest Key Response: OK");

				_nrEnvironmentSettings = JsonConvert.DeserializeObject<NREnvironmentSettings>(response);

				if (!string.IsNullOrEmpty(_nrEnvironmentSettings.Error)) {
					throw new NRApiErrorException(_nrEnvironmentSettings.Error);
				}
			}
			catch (Exception ex) {
				// if we get this far and have failed, just instantiate the settings so the next calls
				// to this method get a default / telemetry "off" state.
				_nrEnvironmentSettings = new NREnvironmentSettings(); 
				Log.Error(ex, "Unable to obtain settings for New Relic telemetry.");
			}

			return _nrEnvironmentSettings;
		}
	}
}
