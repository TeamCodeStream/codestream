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

		public async Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var fullyQualifiedName = context.Properties["FullyQualifiedName"].ToString();
			var splitLocation = fullyQualifiedName.LastIndexOfAny(new[] { '.', '+' });
			var codeNamespace = fullyQualifiedName.Substring(0, splitLocation);
			var functionName = fullyQualifiedName.Substring(splitLocation + 1);

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
						$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
							$"{codeNamespace}.{functionName}"))
					?.RequestsPerMinute;
				var errors = _metrics.ErrorRate?.FirstOrDefault(x =>
						$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
							$"{codeNamespace}.{functionName}"))
					?.ErrorsPerMinute;
				var avgDuration = _metrics.AverageDuration?.FirstOrDefault(x =>
						$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
							$"{codeNamespace}.{functionName}"))
					?.AverageDuration;

				
				// TODO - Probably gonna need a better case-insensitive string replace here
				var formatted = Regex.Replace(_editorFormatString,
					Regex.Escape(CodeLevelMetricConstants.Tokens.Throughput), throughput is null ? "n/a" : $"{throughput.ToFixed(3)}rpm", RegexOptions.IgnoreCase);
				formatted = Regex.Replace(formatted, Regex.Escape(CodeLevelMetricConstants.Tokens.AverageDuration), avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms", RegexOptions.IgnoreCase);
				formatted = Regex.Replace(formatted, Regex.Escape(CodeLevelMetricConstants.Tokens.ErrorsPerMinute), errors is null ? "n/a" : $"{errors.ToFixed(3)}epm", RegexOptions.IgnoreCase);
				formatted = Regex.Replace(formatted, Regex.Escape(CodeLevelMetricConstants.Tokens.Since), _metrics.SinceDateFormatted, RegexOptions.IgnoreCase);

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

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<CodeLensDetailsDescriptor>(null);
		}

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);

		private static string GetStatusText(CodeLevelMetricStatus currentStatus) {
			switch (currentStatus) {
				case CodeLevelMetricStatus.Loading:
					return "Code Level Metrics Loading...";
				case CodeLevelMetricStatus.SignInRequired:
					return "Please sign-in to CodeStream for Code Level Metrics";
				case CodeLevelMetricStatus.Disabled:
					return "CodeLens is enabled, but Code Level Metrics are disabled";
				case CodeLevelMetricStatus.Ready:
				default:
					return "";
			}
		}
	}
}
