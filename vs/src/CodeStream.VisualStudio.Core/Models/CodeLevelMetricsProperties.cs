using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class CodeLevelMetricsProperties {
		[JsonProperty("sinceDateFormatted", NullValueHandling = NullValueHandling.Ignore)]
		public string SinceDateFormatted { get; set; }

		[JsonProperty("newRelicEntityGuid", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicEntityGuid { get; set; }
	}
}
