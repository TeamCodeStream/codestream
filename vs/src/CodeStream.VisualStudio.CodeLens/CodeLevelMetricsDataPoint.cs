using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.CodeLens {
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint {
		private readonly ICodeLensCallbackService _callbackService;
		public readonly string DataPointId = Guid.NewGuid().ToString();
		public VisualStudioConnection VsConnection;

		public CodeLevelMetricDataPoint(CodeLensDescriptor descriptor, ICodeLensCallbackService callbackService) {
			_callbackService = callbackService;
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
		}

		public event AsyncEventHandler InvalidatedAsync;
		public CodeLensDescriptor Descriptor { get; }

		public async Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			
			var isClmReady = await _callbackService
				.InvokeAsync<bool>(this, nameof(ICodeLevelMetricsCallbackService.IsClmReady), cancellationToken: token)
				.ConfigureAwait(false);

			if (!isClmReady) {
				// TODO - this kinda sucks, because it leaves a gap in the CodeLens where this would be placed. The overall
				// initialization has already taken place, so we can't just turn it off.
				return new CodeLensDataPointDescriptor {
					Description = "Code Level Metrics Loading..."
				};
			}
			
			var formatString = await _callbackService
				.InvokeAsync<string>(this, nameof(ICodeLevelMetricsCallbackService.GetClmFormatSetting), cancellationToken: token)
				.ConfigureAwait(false);

			return new CodeLensDataPointDescriptor {
				Description = formatString,
				TooltipText = $"{context.ToJson()}" // "avg duration: 3ms | throughput: 100rpm | error rate: 4epm - since 30min ago"
			};
		}

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<CodeLensDetailsDescriptor>(null);
		}

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);
	}
}
