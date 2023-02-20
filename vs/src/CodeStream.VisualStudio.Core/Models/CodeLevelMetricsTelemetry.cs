using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class CodeLevelMetricsTelemetry
	{
		[JsonProperty("averageDuration", NullValueHandling = NullValueHandling.Ignore)]
		public IList<AverageDurationResponse> AverageDuration { get; }

		[JsonProperty("sampleSize", NullValueHandling = NullValueHandling.Ignore)]
		public IList<SampleSizeResponse> SampleSize { get; }
		[JsonProperty("errorRate", NullValueHandling = NullValueHandling.Ignore)]
		public IList<ErrorRateResponse> ErrorRate { get; }

		[JsonProperty("repo", NullValueHandling = NullValueHandling.Ignore)]
		public RepoInfo Repo { get; }

		[JsonProperty("properties", NullValueHandling = NullValueHandling.Ignore)]
		public CodeLevelMetricsProperties Properties { get; }


		public CodeLevelMetricsTelemetry()
		{
			AverageDuration = new List<AverageDurationResponse>();
			SampleSize = new List<SampleSizeResponse>();
			ErrorRate = new List<ErrorRateResponse>();
			Repo = new RepoInfo();
			Properties = new CodeLevelMetricsProperties();
		}

		public CodeLevelMetricsTelemetry(
			IList<AverageDurationResponse> averageDuration,
			IList<SampleSizeResponse> sampleSize,
			IList<ErrorRateResponse> errorRate,
			string sinceDateFormatted,
			RepoInfo repo,
			string newRelicEntityGuid)
		{

			AverageDuration = averageDuration ?? new List<AverageDurationResponse>();
			SampleSize = sampleSize ?? new List<SampleSizeResponse>();
			ErrorRate = errorRate ?? new List<ErrorRateResponse>();
			Repo = repo ?? new RepoInfo();
			Properties = new CodeLevelMetricsProperties
			{
				NewRelicEntityGuid = newRelicEntityGuid,
				SinceDateFormatted = sinceDateFormatted
			};
		}
	}
}
