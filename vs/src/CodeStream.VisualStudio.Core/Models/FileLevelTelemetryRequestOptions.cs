using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class FileLevelTelemetryRequestOptions
	{
		[JsonProperty("includeThroughput", NullValueHandling = NullValueHandling.Ignore)]
		public bool IncludeThroughput { get; set; }

		[JsonProperty("includeAverageDuration", NullValueHandling = NullValueHandling.Ignore)]
		public bool IncludeAverageDuration { get; set; }

		[JsonProperty("includeErrorRate", NullValueHandling = NullValueHandling.Ignore)]
		public bool IncludeErrorRate { get; set; }
	}
}
