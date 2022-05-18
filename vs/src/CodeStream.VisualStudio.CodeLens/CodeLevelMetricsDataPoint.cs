using System;
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
				return new CodeLensDataPointDescriptor();
			}

			return new CodeLensDataPointDescriptor {
				Description = $"{DataPointId}",
				TooltipText = $"{context.ToJson()}" // "avg duration: 3ms | throughput: 100rpm | error rate: 4epm - since 30min ago"
			};
		}

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<CodeLensDetailsDescriptor>(null);
		}

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);
	}
}
