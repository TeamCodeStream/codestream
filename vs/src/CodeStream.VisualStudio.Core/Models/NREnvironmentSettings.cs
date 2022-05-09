using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models {

	public class NREnvironmentSettings {

		[JsonProperty("error")]
		public string Error { get; set; }

		[JsonProperty("telemetryEndpoint")]
		public string Host { get; set; }

		[JsonProperty("licenseIngestKey")]
		public string LicenseKey { get; set; }

		[JsonProperty("browserIngestKey")]
		public string BrowserLicenseKey { get; set; }

		[JsonProperty("webviewAgentId")]
		public string AgentId { get; set; }

		[JsonProperty("webviewAppId")]
		public string ApplicationId { get; set; }

		[JsonProperty("accountId")]
		public string AccountId { get; set; }


		[JsonIgnore]
		public string AppName = "lsp-agent";

		[JsonIgnore]
		public string LogLevel = "info";

		[JsonIgnore]
		public bool HasValidSettings
			=> !string.IsNullOrEmpty(Host)
			   && !string.IsNullOrEmpty(LicenseKey)
			   && !string.IsNullOrEmpty(ApplicationId)
			   && !string.IsNullOrEmpty(AgentId)
			   && !string.IsNullOrEmpty(AccountId);
	}
}
