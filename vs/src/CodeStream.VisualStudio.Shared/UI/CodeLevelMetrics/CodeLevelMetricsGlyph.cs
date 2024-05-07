using System;
using System.Collections.Generic;
using System.IO;

using Microsoft.VisualStudio.Text.Editor;

using System.Windows.Media.Imaging;
using System.Reflection;

using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

using Constants = CodeStream.VisualStudio.Core.Constants;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	public class CodeLevelMetricsGlyph : IGlyphTag
	{
		private const string BadIcon = "new-relic-logo-small-red.png";
		private const string GoodIcon = "new-relic-logo-small.png";

		public string TooltipText { get; }
		public string AnomalyText { get; }
		public BitmapSource Icon { get; }

		public FileLevelTelemetryRequestOptions MethodLevelTelemetryRequestOptions { get; }
		public ObservabilityAnomaly Anomaly { get; }
		public string CodeNamespace { get; }
		public string FunctionName { get; }
		public string LanguageId { get; }
		public string SinceDateFormatted { get; }
		public string NewRelicEntityGuid { get; }
		public RepoInfo Repo { get; }
		public MetricTimesliceNameMapping MetricTimesliceNameMapping { get; }
		public long NewRelicAccountId { get; }
		public Range Range { get; }

		public CodeLevelMetricsGlyph(
			string functionName,
			GetFileLevelTelemetryResponse fileLevelTelemetryResponse,
			AverageDurationResponse averageDurationResponse,
			ErrorRateResponse errorRateResponse,
			SampleSizeResponse sampleSizeResponse,
			Range methodRange
		)
		{
			Repo = fileLevelTelemetryResponse.Repo;
			CodeNamespace = fileLevelTelemetryResponse.CodeNamespace;

			MetricTimesliceNameMapping = new MetricTimesliceNameMapping
			{
				Duration = averageDurationResponse?.Facet[0] ?? "",
				ErrorRate = errorRateResponse?.Facet[0] ?? "",
				SampleSize = sampleSizeResponse?.Facet[0] ?? "",
				Source = sampleSizeResponse?.Source ?? ""
			};
			LanguageId = "csharp";
			Range = methodRange;
			FunctionName = functionName;
			NewRelicAccountId = fileLevelTelemetryResponse.NewRelicAccountId;
			NewRelicEntityGuid = fileLevelTelemetryResponse.NewRelicEntityGuid;

			MethodLevelTelemetryRequestOptions = new FileLevelTelemetryRequestOptions
			{
				IncludeAverageDuration = true,
				IncludeErrorRate = true,
				IncludeThroughput = true
			};

			SinceDateFormatted = fileLevelTelemetryResponse.SinceDateFormatted;

			var avgDuration = averageDurationResponse?.AverageDuration;
			var errors = errorRateResponse?.ErrorRate;
			var sampleSize = sampleSizeResponse?.SampleSize;

			var formatString = Constants.CodeLevelMetrics.GoldenSignalsFormat;

			TooltipText = formatString.Replace(
				Constants.CodeLevelMetrics.Tokens.AverageDuration,
				avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms"
			);

			TooltipText = TooltipText.Replace(
				Constants.CodeLevelMetrics.Tokens.ErrorRate,
				errors is null ? "n/a" : $"{errors.ToFixed(3)}%"
			);

			TooltipText = TooltipText.Replace(
				Constants.CodeLevelMetrics.Tokens.Since,
				SinceDateFormatted
			);

			TooltipText = TooltipText.Replace(
				Constants.CodeLevelMetrics.Tokens.SampleSize,
				$"{sampleSize}"
			);

			if (errorRateResponse?.Anomaly != null || averageDurationResponse?.Anomaly != null)
			{
				var anomalyText = new List<string>();

				if (errorRateResponse?.Anomaly != null)
				{
					anomalyText.Add($"error rate +{(errorRateResponse.Anomaly.Ratio - 1) * 100}%");
				}

				if (averageDurationResponse?.Anomaly != null)
				{
					anomalyText.Add(
						$"avg duration +{(averageDurationResponse.Anomaly.Ratio - 1) * 100}%"
					);
				}

				var since =
					errorRateResponse?.Anomaly?.SinceText
					?? averageDurationResponse?.Anomaly?.SinceText;

				AnomalyText = string.Join(", ", anomalyText) + $" since {since}";
				Anomaly = averageDurationResponse?.Anomaly ?? errorRateResponse?.Anomaly;
			}

			Icon = LoadImageFromFile(Anomaly != null);
		}

		private static BitmapSource LoadImageFromFile(bool hasAnomaly)
		{
			var assembly = Assembly.GetAssembly(typeof(CodeLevelMetricsGlyphFactory));

			var bitmapImage = new BitmapImage();

			var iconToUse = hasAnomaly ? BadIcon : GoodIcon;

			bitmapImage.BeginInit();
			bitmapImage.UriSource = new Uri(
				Path.GetDirectoryName(assembly.Location) + $"/dist/assets/{iconToUse}",
				UriKind.Absolute
			);
			bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
			bitmapImage.EndInit();

			return bitmapImage;
		}
	}
}
