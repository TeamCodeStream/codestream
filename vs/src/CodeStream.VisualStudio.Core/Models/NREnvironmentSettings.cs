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
		public string BrowserKey { get; set; }

		[JsonIgnore]
		public string AppName = "lsp-agent";

		[JsonIgnore]
		public string LogLevel = "info";

		[JsonIgnore]
		public bool HasValidSettings
			=> !string.IsNullOrEmpty(Host) && !string.IsNullOrEmpty(LicenseKey);
	}
}
