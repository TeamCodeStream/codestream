using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class MetricTimesliceNameMapping
	{
		[JsonProperty("duration", NullValueHandling = NullValueHandling.Ignore)]
		public string Duration { get; set; }

		[JsonProperty("sampleSize", NullValueHandling = NullValueHandling.Ignore)]
		public string SampleSize { get; set; }

		[JsonProperty("errorRate", NullValueHandling = NullValueHandling.Ignore)]
		public string ErrorRate { get; set; }

		[JsonProperty("source", NullValueHandling = NullValueHandling.Ignore)]
		public string Source { get; set; }
	}
}
