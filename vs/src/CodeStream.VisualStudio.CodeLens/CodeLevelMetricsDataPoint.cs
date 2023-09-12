using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.CodeLevelMetrics;
using CodeStream.VisualStudio.Core.Enums;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;

using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;

using Serilog;

namespace CodeStream.VisualStudio.CodeLens
{
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint
	{
		private static readonly ILogger Log = LogManager.ForContext<CodeLevelMetricDataPoint>();
		private readonly ICodeLensCallbackService _callbackService;
		private CodeLevelMetricsTelemetry _metrics;
		private string _editorFormatString;

		public readonly string DataPointId = Guid.NewGuid().ToString();

		public VisualStudioConnection VsConnection;
		public event AsyncEventHandler InvalidatedAsync;
		public CodeLensDescriptor Descriptor { get; }

		public CodeLevelMetricDataPoint(
			CodeLensDescriptor descriptor,
			ICodeLensCallbackService callbackService
		)
		{
			_callbackService = callbackService;
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
		}

		/// <summary>
		/// Populates the actual "CodeLens" entry using the CallbackService.
		/// </summary>
		/// <remarks>
		/// There is some duplication between this method and <see cref="GetDetailsAsync" />, but with slight variations.
		/// </remarks>
		public async Task<CodeLensDataPointDescriptor> GetDataAsync(
			CodeLensDescriptorContext context,
			CancellationToken token
		)
		{
			var fullyQualifiedName = context.Properties["FullyQualifiedName"].ToString();
			var splitLocation = fullyQualifiedName.LastIndexOfAny(new[] { '.', '+' });
			var codeNamespace = fullyQualifiedName.Substring(0, splitLocation);
			var functionName = fullyQualifiedName.Substring(splitLocation + 1);

			try
			{
				var clmStatus = await _callbackService
					.InvokeAsync<CodeLevelMetricStatus>(
						this,
						nameof(ICodeLevelMetricsCallbackService.GetClmStatus),
						cancellationToken: token
					)
					.ConfigureAwait(false);

				if (clmStatus != CodeLevelMetricStatus.Ready)
				{
					return new CodeLensDataPointDescriptor
					{
						Description = GetStatusText(clmStatus)
					};
				}

				_editorFormatString = Constants.CodeLevelMetrics.GoldenSignalsFormat.ToLower();

				_metrics = await _callbackService
					.InvokeAsync<CodeLevelMetricsTelemetry>(
						this,
						nameof(ICodeLevelMetricsCallbackService.GetTelemetryAsync),
						new object[] { codeNamespace, functionName },
						cancellationToken: token
					)
					.ConfigureAwait(false);

				_metrics = _metrics ?? new CodeLevelMetricsTelemetry();

				var avgDuration = _metrics.AverageDuration?.AverageDuration;
				var errors = _metrics.ErrorRate?.ErrorRate;
				var sampleSize = _metrics.SampleSize?.SampleSize;

				var formatted = Regex.Replace(
					_editorFormatString,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.AverageDuration),
					avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms",
					RegexOptions.IgnoreCase
				);
				formatted = Regex.Replace(
					formatted,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.ErrorRate),
					errors is null ? "n/a" : $"{errors.ToFixed(3)}%",
					RegexOptions.IgnoreCase
				);
				formatted = Regex.Replace(
					formatted,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.Since),
					_metrics.Properties.SinceDateFormatted,
					RegexOptions.IgnoreCase
				);
				formatted = Regex.Replace(
					formatted,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.SampleSize),
					sampleSize is null ? "0" : $"{sampleSize}",
					RegexOptions.IgnoreCase
				);

				if (sampleSize is null)
				{
					formatted = "no metrics found for this method in the last 30 minutes";
				}

				return new CodeLensDataPointDescriptor
				{
					Description = formatted,
					TooltipText = formatted
				};
			}
			catch (Exception ex)
			{
				Log.Error(ex, $"Unable to render Code Level Metrics for {fullyQualifiedName}");
				return new CodeLensDataPointDescriptor
				{
					Description =
						"we ran into an exception loading metrics for this method - please contact support"
				};
			}
		}

		/// <summary>
		/// Populates the data to pass to the WPF view <seealso cref="ToolWindows.CodeLevelMetricsDetails.ViewMore_OnMouseDown" />
		/// when a user "clicks" the CodeLens description populated from <see cref="GetDataAsync"/>
		/// </summary>
		/// <remarks>
		/// There is some duplication between this method and <see cref="GetDataAsync" />, but with slight variations.
		/// </remarks>
		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(
			CodeLensDescriptorContext context,
			CancellationToken token
		)
		{
			var fullyQualifiedName = context.Properties["FullyQualifiedName"].ToString();
			var splitLocation = fullyQualifiedName.LastIndexOfAny(new[] { '.', '+' });
			var functionName = fullyQualifiedName.Substring(splitLocation + 1);

			var errorRate = _metrics.ErrorRate;
			var avgDuration = _metrics.AverageDuration;
			var sampleSize = _metrics.SampleSize;

			var descriptor = new CodeLensDetailsDescriptor();
			var data = new CodeLevelMetricsData
			{
				Repo = _metrics.Repo,
				FunctionName = functionName,
				NewRelicEntityGuid = _metrics.Properties.NewRelicEntityGuid,
				MetricTimeSliceNameMapping = new MetricTimesliceNameMapping
				{
					Duration = avgDuration?.MetricTimesliceName ?? "",
					ErrorRate = errorRate?.MetricTimesliceName ?? "",
					SampleSize = sampleSize?.MetricTimesliceName ?? "",
					Source = sampleSize?.Source ?? ""
				}
			};

			//Using string positions of the tokens, figure out an "order" of the tokens. Since IndexOf is a positive integer if its there,
			//we're assuming that will be sufficient
			var formatString = _editorFormatString.ToLower();
			var averageDurationPosition = formatString.IndexOf(
				Constants.CodeLevelMetrics.Tokens.AverageDuration,
				StringComparison.OrdinalIgnoreCase
			);
			var errorRatePosition = formatString.IndexOf(
				Constants.CodeLevelMetrics.Tokens.ErrorRate,
				StringComparison.OrdinalIgnoreCase
			);
			var sincePosition = formatString.IndexOf(
				Constants.CodeLevelMetrics.Tokens.Since,
				StringComparison.OrdinalIgnoreCase
			);
			var sampleSizePosition = formatString.IndexOf(
				Constants.CodeLevelMetrics.Tokens.SampleSize,
				StringComparison.OrdinalIgnoreCase
			);

			var configuredPositions = new List<CodeLevelMetricsDetail>
			{
				new CodeLevelMetricsDetail(
					averageDurationPosition,
					"avg duration",
					avgDuration?.AverageDuration is null
						? "n/a"
						: $"{avgDuration.AverageDuration.ToFixed(3)}ms"
				),
				new CodeLevelMetricsDetail(
					errorRatePosition,
					"error rate",
					errorRate?.ErrorRate is null ? "n/a" : $"{errorRate.ErrorRate.ToFixed(3)}%"
				),
				new CodeLevelMetricsDetail(
					sincePosition,
					"since",
					_metrics?.Properties?.SinceDateFormatted ?? "n/a"
				),
				new CodeLevelMetricsDetail(
					sampleSizePosition,
					(sampleSize?.SampleSize ?? "0") == "1" ? "sample" : "samples",
					sampleSize?.SampleSize ?? "0"
				)
			};

			foreach (var entry in configuredPositions.OrderBy(x => x.Order))
			{
				//this was the position in the string of the token - if the token isn't there, we won't add that item to the payload for the XAML view
				if (entry.Order < 1)
				{
					continue;
				}

				data.Details.Add(entry);
			}

			descriptor.Headers = new List<CodeLensDetailHeaderDescriptor>();
			descriptor.CustomData = new List<CodeLevelMetricsData> { data };
			descriptor.Entries = new List<CodeLensDetailEntryDescriptor>();

			return Task.FromResult(descriptor);
		}

		public void Refresh() =>
			_ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);

		private static string GetStatusText(CodeLevelMetricStatus currentStatus)
		{
			switch (currentStatus)
			{
				case CodeLevelMetricStatus.Loading:
					return "New Relic CodeStream Code Level Metrics Loading...";
				case CodeLevelMetricStatus.SignInRequired:
					return "Please sign-in to New Relic CodeStream to see Code Level Metrics";
				case CodeLevelMetricStatus.Ready:
				default:
					return "";
			}
		}
	}
}
