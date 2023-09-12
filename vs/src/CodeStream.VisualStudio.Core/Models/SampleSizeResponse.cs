using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class SampleSizeResponse
	{
		[JsonProperty("sampleSize", NullValueHandling = NullValueHandling.Ignore)]
		public string SampleSize { get; set; }

		[JsonProperty("namespace", NullValueHandling = NullValueHandling.Ignore)]
		public string Namespace { get; set; }

		[JsonProperty("className", NullValueHandling = NullValueHandling.Ignore)]
		public string ClassName { get; set; }

		[JsonProperty("functionName", NullValueHandling = NullValueHandling.Ignore)]
		public string FunctionName { get; set; }

		[JsonProperty("source", NullValueHandling = NullValueHandling.Ignore)]
		public string Source { get; set; }

		[JsonProperty("metricTimesliceName", NullValueHandling = NullValueHandling.Ignore)]
		public string MetricTimesliceName { get; set; }
	}
}
