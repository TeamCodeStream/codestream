using System.Collections.Generic;

using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class ObservabilityAnomaly
	{
		[JsonProperty("language", NullValueHandling = NullValueHandling.Ignore)]
		public string Language { get; set; }

		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }

		[JsonProperty("scope", NullValueHandling = NullValueHandling.Ignore)]
		public string Scope { get; set; }

		[JsonProperty("children", NullValueHandling = NullValueHandling.Ignore)]
		public IList<ObservabilityAnomaly> Children { get; set; } =
			new List<ObservabilityAnomaly>();

		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public string Type { get; set; }

		[JsonProperty("codeAttrs", NullValueHandling = NullValueHandling.Ignore)]
		public CodeAttributes CodeAttributes { get; set; }

		[JsonProperty("oldValue", NullValueHandling = NullValueHandling.Ignore)]
		public decimal OldValue { get; set; }

		[JsonProperty("newValue", NullValueHandling = NullValueHandling.Ignore)]
		public decimal NewValue { get; set; }

		[JsonProperty("ratio", NullValueHandling = NullValueHandling.Ignore)]
		public decimal Ratio { get; set; }

		[JsonProperty("text", NullValueHandling = NullValueHandling.Ignore)]
		public string Text { get; set; }

		[JsonProperty("totalDays", NullValueHandling = NullValueHandling.Ignore)]
		public int TotalDays { get; set; }

		[JsonProperty("sinceText", NullValueHandling = NullValueHandling.Ignore)]
		public string SinceText { get; set; }

		[JsonProperty("metricTimesliceName", NullValueHandling = NullValueHandling.Ignore)]
		public string MetricTimesliceName { get; set; }

		[JsonProperty("errorMetricTimesliceName", NullValueHandling = NullValueHandling.Ignore)]
		public string ErrorMetricTimesliceName { get; set; }

		[JsonProperty("chartHeaderTexts", NullValueHandling = NullValueHandling.Ignore)]
		public Dictionary<string, string> ChartHeaderTexts { get; set; } =
			new Dictionary<string, string>();

		[JsonProperty("notificationText", NullValueHandling = NullValueHandling.Ignore)]
		public string NotificationText { get; set; }

		[JsonProperty("entityName", NullValueHandling = NullValueHandling.Ignore)]
		public string EntityName { get; set; }
	}
}
