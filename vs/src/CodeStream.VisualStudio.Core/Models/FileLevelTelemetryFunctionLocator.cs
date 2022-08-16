using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class FileLevelTelemetryFunctionLocator {
		[JsonProperty("namespace", NullValueHandling = NullValueHandling.Ignore)]
		public string Namespace { get; set; }
		[JsonProperty("functionName", NullValueHandling = NullValueHandling.Ignore)]
		public string FunctionName { get; set; }
	}
}
