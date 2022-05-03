using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Services {
	public class NREnvironmentSettings {
		[JsonProperty("telemetryEndpoint")]
		public string Host { get; set; }

		[JsonProperty("licenseIngestKey")]
		public string LicenseKey { get; set; }

		[JsonIgnore]
		public string AppName { get; } = "lsp-agent";

		[JsonIgnore]
		public string LogLevel { get; } = "info";
	}
}
