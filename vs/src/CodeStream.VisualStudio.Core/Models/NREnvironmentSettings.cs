using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models {

	public class NREnvironmentSettings {

		[JsonProperty("telemetryEndpoint")]
		public string Host { get; set; }

		[JsonProperty("licenseIngestKey")]
		public string LicenseKey { get; set; }

		[JsonIgnore]
		public string AppName = "lsp-agent";

		[JsonIgnore]
		public string LogLevel = "info";

		[JsonIgnore]
		public bool HasValidSettings
			=> !string.IsNullOrEmpty(Host) && !string.IsNullOrEmpty(LicenseKey);
	}
}
