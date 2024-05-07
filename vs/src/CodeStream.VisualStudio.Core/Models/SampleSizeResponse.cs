using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class SampleSizeResponse
	{
		[JsonProperty("sampleSize", NullValueHandling = NullValueHandling.Ignore)]
		public long SampleSize { get; set; }

		[JsonProperty("source", NullValueHandling = NullValueHandling.Ignore)]
		public string Source { get; set; }

		[JsonProperty("facet", NullValueHandling = NullValueHandling.Ignore)]
		public string[] Facet { get; set; }

		[JsonProperty("namespace", NullValueHandling = NullValueHandling.Ignore)]
		public string Namespace { get; set; }

		[JsonProperty("className", NullValueHandling = NullValueHandling.Ignore)]
		public string ClassName { get; set; }

		[JsonProperty("lineno", NullValueHandling = NullValueHandling.Ignore)]
		public long LineNumber { get; set; }

		[JsonProperty("column", NullValueHandling = NullValueHandling.Ignore)]
		public long Column { get; set; }

		[JsonProperty("commit", NullValueHandling = NullValueHandling.Ignore)]
		public string Commit { get; set; }

		[JsonProperty("functionName", NullValueHandling = NullValueHandling.Ignore)]
		public string FunctionName { get; set; }

		[JsonProperty("anomaly", NullValueHandling = NullValueHandling.Ignore)]
		public ObservabilityAnomaly Anomaly { get; set; }
	}
}
