using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared;
using CodeStream.VisualStudio.Shared.Enums;
using CodeStream.VisualStudio.Shared.Interfaces;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;
using Serilog;

namespace CodeStream.VisualStudio.CodeLens {
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint {
		private static readonly ILogger Log = LogManager.ForContext<CodeLevelMetricDataPoint>();
		private readonly ICodeLensCallbackService _callbackService;
		private GetFileLevelTelemetryResponse _metrics;
		private string _editorFormatString;

		public readonly string DataPointId = Guid.NewGuid().ToString();

		public VisualStudioConnection VsConnection;
		public event AsyncEventHandler InvalidatedAsync;
		public CodeLensDescriptor Descriptor { get; }

		public CodeLevelMetricDataPoint(CodeLensDescriptor descriptor, ICodeLensCallbackService callbackService) {
			_callbackService = callbackService;
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
		}

		/// <summary>
		/// Populates the actual "CodeLens" entry using the CallbackService. 
		/// </summary>
		/// <remarks>
		/// There is some duplication between this method and <see cref="GetDetailsAsync" />, but with slight variations.
		/// </remarks>
		public async Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var fullyQualifiedName = context.Properties["FullyQualifiedName"].ToString();
			var splitLocation = fullyQualifiedName.LastIndexOfAny(new[] { '.', '+' });
			var codeNamespace = fullyQualifiedName.Substring(0, splitLocation);
			var functionName = fullyQualifiedName.Substring(splitLocation + 1);
			var namespaceFunction = $"{codeNamespace}.{functionName}";	// this is how we store data in NR1

			try {
				var clmStatus = await _callbackService
					.InvokeAsync<CodeLevelMetricStatus>(this, nameof(ICodeLevelMetricsCallbackService.GetClmStatus),
						cancellationToken: token)
					.ConfigureAwait(false);

				if (clmStatus != CodeLevelMetricStatus.Ready) {
					return new CodeLensDataPointDescriptor {
						Description = GetStatusText(clmStatus)
					};
				}

				_editorFormatString = await _callbackService
					.InvokeAsync<string>(
						this,
						nameof(ICodeLevelMetricsCallbackService.GetEditorFormat),
						cancellationToken: token)
					.ConfigureAwait(false);

				_metrics = await _callbackService
					.InvokeAsync<GetFileLevelTelemetryResponse>(
						this,
						nameof(ICodeLevelMetricsCallbackService.GetTelemetryAsync),
						new object[] { codeNamespace, functionName },
						cancellationToken: token)
					.ConfigureAwait(false);

				_metrics = _metrics ?? new GetFileLevelTelemetryResponse();

				var throughput = _metrics.Throughput?.FirstOrDefault(x =>
						$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(namespaceFunction))?.RequestsPerMinute;
				var errors = _metrics.ErrorRate?.FirstOrDefault(x =>
						$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(namespaceFunction))?.ErrorsPerMinute;
				var avgDuration = _metrics.AverageDuration?.FirstOrDefault(x =>
						$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(namespaceFunction))
					?.AverageDuration;

				// TODO - Probably gonna need a better case-insensitive string replace here
				var formatted = Regex.Replace(_editorFormatString,
					Regex.Escape(Constants.CodeLevelMetrics.Tokens.Throughput), throughput is null ? "n/a" : $"{throughput.ToFixed(3)}rpm", RegexOptions.IgnoreCase);
				formatted = Regex.Replace(formatted, Regex.Escape(Constants.CodeLevelMetrics.Tokens.AverageDuration), avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms", RegexOptions.IgnoreCase);
				formatted = Regex.Replace(formatted, Regex.Escape(Constants.CodeLevelMetrics.Tokens.ErrorsPerMinute), errors is null ? "n/a" : $"{errors.ToFixed(3)}epm", RegexOptions.IgnoreCase);
				formatted = Regex.Replace(formatted, Regex.Escape(Constants.CodeLevelMetrics.Tokens.Since), _metrics.SinceDateFormatted, RegexOptions.IgnoreCase);

				return new CodeLensDataPointDescriptor {
					Description = formatted,
					TooltipText = formatted
				};
			}
			catch (Exception ex) {
				Log.Error(ex, $"Unable to render Code Level Metrics for {fullyQualifiedName}");
				return new CodeLensDataPointDescriptor {
					Description = "Sorry, we were unable to render Code Level Metrics for this method!"
				};
			}
		}

		/// <summary>
		/// Populates the data to pass to the WPF view <seealso cref="VisualStudio.UI.ToolWindows.CodeLevelMetricsDetails.ViewMore_OnMouseDown" />
		/// when a user "clicks" the CodeLens description populated from <see cref="GetDataAsync"/>
		/// </summary>
		/// <remarks>
		/// There is some duplication between this method and <see cref="GetDataAsync" />, but with slight variations.
		/// </remarks>
		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var fullyQualifiedName = context.Properties["FullyQualifiedName"].ToString();
			var splitLocation = fullyQualifiedName.LastIndexOfAny(new[] { '.', '+' });
			var codeNamespace = fullyQualifiedName.Substring(0, splitLocation);
			var functionName = fullyQualifiedName.Substring(splitLocation + 1);
			var namespaceFunction = $"{codeNamespace}.{functionName}";

			var throughput = _metrics.Throughput?.FirstOrDefault(x =>
				$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(namespaceFunction));
			var errors = _metrics.ErrorRate?.FirstOrDefault(x =>
				$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(namespaceFunction));
			var avgDuration = _metrics.AverageDuration?.FirstOrDefault(x =>
				$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(namespaceFunction));

			//Using string positions of the tokens, figure out an "order" of the tokens. Since IndexOf is a positive integer if its there,
			//we're assuming that will be sufficient
			var formatString = _editorFormatString.ToLower();
			var throughputPosition = formatString.IndexOf(Constants.CodeLevelMetrics.Tokens.Throughput, StringComparison.OrdinalIgnoreCase);
			var averageDurationPosition = formatString.IndexOf(Constants.CodeLevelMetrics.Tokens.AverageDuration, StringComparison.OrdinalIgnoreCase);
			var errorRatePosition = formatString.IndexOf(Constants.CodeLevelMetrics.Tokens.ErrorsPerMinute, StringComparison.OrdinalIgnoreCase);
			var sincePosition = formatString.IndexOf(Constants.CodeLevelMetrics.Tokens.Since, StringComparison.OrdinalIgnoreCase);

			var configuredPositions = new List<Tuple<int, string, string>> {
				new Tuple<int, string, string>(throughputPosition, "Throughput", throughput is null ? "n/a" : $"{throughput.RequestsPerMinute.ToFixed(3)}rpm"),
				new Tuple<int, string, string>(averageDurationPosition, "Avg. Duration", avgDuration is null ? "n/a" : $"{avgDuration.AverageDuration.ToFixed(3)}ms"),
				new Tuple<int, string, string>(errorRatePosition, "Errors per Minute", errors is null ? "n/a" : $"{errors.ErrorsPerMinute.ToFixed(3)}epm"),
				new Tuple<int, string, string>(sincePosition, "Since", _metrics.SinceDateFormatted)
			};

			var descriptor = new CodeLensDetailsDescriptor();
			var data = new CodeLevelMetricsData {
				Repo = _metrics.Repo,
				FunctionName = functionName,
				NewRelicEntityGuid = _metrics.NewRelicEntityGuid,
				MetricTimeSliceNameMapping = new MetricTimesliceNameMapping {
					D = avgDuration?.MetricTimesliceName ?? "",
					T = throughput?.MetricTimesliceName ?? "",
					E = errors?.MetricTimesliceName ?? ""
				}
			};

			foreach (var entry in configuredPositions.OrderBy(x => x.Item1)) {

				//this was the position in the string of the token - if the token isn't there, we won't add that item to the payload for the XAML view
				if (entry.Item1 < 1) {
					continue;
				}

				data.Details.Add(new CodeLevelMetricsDetail {
					Order = entry.Item1,
					Header = entry.Item2,
					Value = entry.Item3
				});
			}

			descriptor.Headers = new List<CodeLensDetailHeaderDescriptor>();
			descriptor.CustomData = new List<CodeLevelMetricsData> { data };
			descriptor.Entries = new List<CodeLensDetailEntryDescriptor>();

			return Task.FromResult(descriptor);
		}

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);

		private static string GetStatusText(CodeLevelMetricStatus currentStatus) {
			switch (currentStatus) {
				case CodeLevelMetricStatus.Loading:
					return "Code Level Metrics Loading...";
				case CodeLevelMetricStatus.SignInRequired:
					return "Please sign-in to CodeStream for Code Level Metrics";
				case CodeLevelMetricStatus.Ready:
				default:
					return "";
			}
		}
	}
}
