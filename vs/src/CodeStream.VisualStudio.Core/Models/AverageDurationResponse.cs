using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class AverageDurationResponse {
		[JsonProperty("averageDuration", NullValueHandling = NullValueHandling.Ignore)]
		public string AverageDuration { get; set; }
		[JsonProperty("namespace", NullValueHandling = NullValueHandling.Ignore)]
		public string Namespace { get; set; }
		[JsonProperty("className", NullValueHandling = NullValueHandling.Ignore)]
		public string ClassName { get; set; }
		[JsonProperty("functionName", NullValueHandling = NullValueHandling.Ignore)]
		public string FunctionName { get; set; }
		[JsonProperty("metricTimesliceName", NullValueHandling = NullValueHandling.Ignore)]
		public string MetricTimesliceName { get; set; }
	}
}
