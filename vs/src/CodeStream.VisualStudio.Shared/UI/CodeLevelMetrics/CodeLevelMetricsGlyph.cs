using System;
using System.IO;

using Microsoft.VisualStudio.Text.Editor;

using System.Windows.Media.Imaging;
using System.Reflection;
using System.Text.RegularExpressions;

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
		public string NamespaceFunction { get; }
		public string SinceDateFormatted { get; }
		public AverageDurationResponse AvgDurationResponse { get; }
		public ErrorRateResponse ErrorRateResponse { get; }
		public SampleSizeResponse SampleSizeResponse { get; }

		public CodeLevelMetricsGlyph(
			string namespaceFunction,
			string sinceDateFormatted,
			AverageDurationResponse avgDurationResponse,
			ErrorRateResponse errorRateResponse,
			SampleSizeResponse sampleSizeResponse
		)
		{
			NamespaceFunction = namespaceFunction;
			SinceDateFormatted = sinceDateFormatted;
			AvgDurationResponse = avgDurationResponse;
			ErrorRateResponse = errorRateResponse;
			SampleSizeResponse = sampleSizeResponse;

			var avgDuration = AvgDurationResponse?.AverageDuration;
			var errors = ErrorRateResponse?.ErrorRate;
			var sampleSize = SampleSizeResponse?.SampleSize;
			var formatString = Constants.CodeLevelMetrics.GoldenSignalsFormat.ToLower();

			if (sampleSize is null)
			{
				Tooltip = "No metrics found for this method in the last 30 minutes";
			}
			else
			{
				Tooltip = Regex.Replace(
					formatString,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.AverageDuration),
					avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms",
					RegexOptions.IgnoreCase
				);

				Tooltip = Regex.Replace(
					Tooltip,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.ErrorRate),
					errors is null ? "n/a" : $"{errors.ToFixed(3)}%",
					RegexOptions.IgnoreCase
				);

				Tooltip = Regex.Replace(
					Tooltip,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.Since),
					SinceDateFormatted,
					RegexOptions.IgnoreCase
				);

				Tooltip = Regex.Replace(
					Tooltip,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.SampleSize),
					$"{sampleSize}",
					RegexOptions.IgnoreCase
				);
			}

			var hasAnomaly = false;
			if (AvgDurationResponse?.Anomaly != null)
			{
				Anomaly += AvgDurationResponse.Anomaly.Text;
				hasAnomaly = true;
			}

			if (ErrorRateResponse?.Anomaly != null)
			{
				Anomaly += ErrorRateResponse.Anomaly.Text;
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
