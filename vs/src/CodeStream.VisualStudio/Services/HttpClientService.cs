using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Newtonsoft.Json;
using Serilog;
using System;
using System.ComponentModel.Composition;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(IHttpClientService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class HttpClientService : IHttpClientService {
		private static readonly ILogger Log = LogManager.ForContext<HttpClientService>();

		private readonly ISettingsServiceFactory _settingsServiceFactory;

		[ImportingConstructor]
		public HttpClientService(ISettingsServiceFactory settingsServiceFactory) {
			_settingsServiceFactory = settingsServiceFactory;
		}

		public async Task<NREnvironmentSettings> GetNREnvironmentSettingsAsync() {
			try {
				var settingsManager = _settingsServiceFactory.GetOrCreate(nameof(HttpClientService));
				var handler = new HttpClientHandler();

				if (settingsManager.ProxySupport == ProxySupport.Off) {
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
				var response = await client.GetStringAsync("/no-auth/nr-injest-key");

				return JsonConvert.DeserializeObject<NREnvironmentSettings>(response);
			}
			catch (Exception ex) {
				Log.Error(ex, "Unable to obtain settings for New Relic telemetry.");
			}

			return await Task.FromResult(new NREnvironmentSettings());
		}
	}
}
