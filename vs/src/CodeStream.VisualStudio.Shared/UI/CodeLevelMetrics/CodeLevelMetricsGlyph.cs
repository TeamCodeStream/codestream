using System;
using System.IO;

using Microsoft.VisualStudio.Text.Editor;

using System.Windows.Media.Imaging;
using System.Reflection;

using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	public class CodeLevelMetricsGlyph : IGlyphTag
	{
		private const string BadIcon = "new-relic-logo-small-red.png";
		private const string GoodIcon = "new-relic-logo-small.png";

		public string Tooltip { get; }
		public string Anomaly { get; }
		public BitmapSource Icon { get; }
		public string FullyQualifiedFunctionName { get; }
		public string FunctionName { get; }
		public string SinceDateFormatted { get; }
		public string NewRelicEntityGuid { get; }
		public RepoInfo Repo { get; }
		public MetricTimesliceNameMapping MetricTimesliceNameMapping { get; }
		public AverageDurationResponse AvgDurationResponse { get; }
		public ErrorRateResponse ErrorRateResponse { get; }
		public SampleSizeResponse SampleSizeResponse { get; }

		public CodeLevelMetricsGlyph(
			string fullyQualifiedFunctionName,
			string functionName,
			string sinceDateFormatted,
			string newRelicEntityGuid,
			RepoInfo repo,
			AverageDurationResponse avgDurationResponse,
			ErrorRateResponse errorRateResponse,
			SampleSizeResponse sampleSizeResponse
		)
		{
			FullyQualifiedFunctionName = fullyQualifiedFunctionName;
			FunctionName = functionName;
			SinceDateFormatted = sinceDateFormatted;
			NewRelicEntityGuid = newRelicEntityGuid;
			Repo = repo;
			AvgDurationResponse = avgDurationResponse;
			ErrorRateResponse = errorRateResponse;
			SampleSizeResponse = sampleSizeResponse;
			MetricTimesliceNameMapping = new MetricTimesliceNameMapping
			{
				Duration = AvgDurationResponse?.MetricTimesliceName ?? "",
				ErrorRate = ErrorRateResponse?.MetricTimesliceName ?? "",
				SampleSize = SampleSizeResponse?.MetricTimesliceName ?? "",
				Source = SampleSizeResponse?.Source ?? ""
			};

			var avgDuration = AvgDurationResponse?.AverageDuration;
			var errors = ErrorRateResponse?.ErrorRate;
			var sampleSize = SampleSizeResponse?.SampleSize;

			if (sampleSize is null)
			{
				Tooltip = "No metrics found for this method in the last 30 minutes";
			}
			else
			{
				var formatString = Constants.CodeLevelMetrics.GoldenSignalsFormat;

				Tooltip = formatString.Replace(
					Constants.CodeLevelMetrics.Tokens.AverageDuration,
					avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms"
				);

				Tooltip = Tooltip.Replace(
					Constants.CodeLevelMetrics.Tokens.ErrorRate,
					errors is null ? "n/a" : $"{errors.ToFixed(3)}%"
				);

				Tooltip = Tooltip.Replace(
					Constants.CodeLevelMetrics.Tokens.Since,
					SinceDateFormatted
				);

				Tooltip = Tooltip.Replace(
					Constants.CodeLevelMetrics.Tokens.SampleSize,
					$"{sampleSize}"
				);
			}

			var hasAnomaly = false;
			if (AvgDurationResponse?.Anomaly != null)
			{
				Anomaly += AvgDurationResponse.Anomaly.NotificationText;
				hasAnomaly = true;
			}

			if (ErrorRateResponse?.Anomaly != null)
			{
				Anomaly += ErrorRateResponse.Anomaly.NotificationText;
				hasAnomaly = true;
			}

			Icon = LoadImageFromFile(hasAnomaly);
		}

		private static BitmapSource LoadImageFromFile(bool hasAnomaly)
		{
			var assembly = Assembly.GetAssembly(typeof(CodeLevelMetricsGlyphFactory));

			var bitmapImage = new BitmapImage();

			var iconToUse = hasAnomaly ? BadIcon : GoodIcon;

			bitmapImage.BeginInit();
			bitmapImage.UriSource = new Uri(
				Path.GetDirectoryName(assembly.Location) + $"/resources/assets/{iconToUse}",
				UriKind.Absolute
			);
			bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
			bitmapImage.EndInit();

			return bitmapImage;
		}
	}
}
