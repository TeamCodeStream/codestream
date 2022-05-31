using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.CodeLens {
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint {
		private readonly ICodeLensCallbackService _callbackService;
		public readonly string DataPointId = Guid.NewGuid().ToString();

		public VisualStudioConnection VsConnection;
		public event AsyncEventHandler InvalidatedAsync;
		public CodeLensDescriptor Descriptor { get; }

		public CodeLevelMetricDataPoint(CodeLensDescriptor descriptor, ICodeLensCallbackService callbackService) {
			_callbackService = callbackService;
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
		}

		public async Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var clmStatus = await _callbackService
				.InvokeAsync<CodeLevelMetricStatus>(this, nameof(ICodeLevelMetricsCallbackService.GetClmStatus), cancellationToken: token)
				.ConfigureAwait(false);

			if (clmStatus != CodeLevelMetricStatus.Ready) {
				return new CodeLensDataPointDescriptor {
					Description = GetStatusText(clmStatus)
				};
			}

			var fullyQualifiedName = context.Properties["FullyQualifiedName"].ToString();
			var splitLocation = fullyQualifiedName.LastIndexOfAny(new[] { '.', '+' });
			var codeNamespace = fullyQualifiedName.Substring(0, splitLocation);
			var functionName = fullyQualifiedName.Substring(splitLocation + 1);

			var metrics = await _callbackService
				.InvokeAsync<string>(
					this,
					nameof(ICodeLevelMetricsCallbackService.GetTelemetryAsync),
					new object[] { codeNamespace, functionName},
					cancellationToken: token)
				.ConfigureAwait(false);
			
			return new CodeLensDataPointDescriptor {
				Description = metrics,
				TooltipText = ""
			};
		}

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var descriptor = new CodeLensDetailsDescriptor();

			var headers = new List<CodeLensDetailHeaderDescriptor> {
				new CodeLensDetailHeaderDescriptor {
					UniqueName = "header1",
					Width = .33,
					DisplayName = "Average Duration",
					IsVisible = true
				},
				new CodeLensDetailHeaderDescriptor {
					UniqueName = "header2",
					Width = .33,
					DisplayName = "Throughput",
					IsVisible = true
				},
				new CodeLensDetailHeaderDescriptor {
					UniqueName = "header3",
					Width = .33,
					DisplayName = "Error Rate",
					IsVisible = true
				}
			};

			descriptor.Headers = headers;
			
			var details = new List<CodeLensDetailEntryDescriptor> {
				new CodeLensDetailEntryDescriptor {
					Fields = new List<CodeLensDetailEntryField> {
						new CodeLensDetailEntryField {
							Text = "3ms"
						},
						new CodeLensDetailEntryField {
							Text = "100rpm"
						},
						new CodeLensDetailEntryField {
							Text = "4epm - since 30m ago"
						}
					}
				}
			};
			descriptor.Entries = details;

			return Task.FromResult(descriptor);
		}

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);

		private static string GetStatusText(CodeLevelMetricStatus currentStatus) {
			switch (currentStatus) {
				case CodeLevelMetricStatus.Loading:
					return "CodeStream Code Level Metrics Loading...";
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
