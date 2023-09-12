using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class CodeLevelMetricsTelemetry
	{
		[JsonProperty("averageDuration", NullValueHandling = NullValueHandling.Ignore)]
		public AverageDurationResponse AverageDuration { get; }

		[JsonProperty("sampleSize", NullValueHandling = NullValueHandling.Ignore)]
		public SampleSizeResponse SampleSize { get; }

		[JsonProperty("errorRate", NullValueHandling = NullValueHandling.Ignore)]
		public ErrorRateResponse ErrorRate { get; }

		[JsonProperty("repo", NullValueHandling = NullValueHandling.Ignore)]
		public RepoInfo Repo { get; }

		[JsonProperty("properties", NullValueHandling = NullValueHandling.Ignore)]
		public CodeLevelMetricsProperties Properties { get; }

		public CodeLevelMetricsTelemetry()
		{
			AverageDuration = new AverageDurationResponse();
			SampleSize = new SampleSizeResponse();
			ErrorRate = new ErrorRateResponse();
			Repo = new RepoInfo();
			Properties = new CodeLevelMetricsProperties();
		}

		public CodeLevelMetricsTelemetry(
			AverageDurationResponse averageDuration,
			SampleSizeResponse sampleSize,
			ErrorRateResponse errorRate,
			string sinceDateFormatted,
			RepoInfo repo,
			string newRelicEntityGuid
		)
		{
			AverageDuration = averageDuration ?? new AverageDurationResponse();
			SampleSize = sampleSize ?? new SampleSizeResponse();
			ErrorRate = errorRate ?? new ErrorRateResponse();
			Repo = repo ?? new RepoInfo();
			Properties = new CodeLevelMetricsProperties
			{
				NewRelicEntityGuid = newRelicEntityGuid,
				SinceDateFormatted = sinceDateFormatted
			};
		}
	}
}
