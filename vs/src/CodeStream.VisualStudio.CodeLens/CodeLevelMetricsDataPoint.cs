using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.CodeLens {
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint {
		private readonly ICodeLensCallbackService _callbackService;
		private VisualStudioConnectionHandler _visualStudioConnection;

		public readonly Guid DataPointId = Guid.NewGuid();

		public CodeLevelMetricDataPoint(ICodeLensCallbackService callbackService, CodeLensDescriptor descriptor) {
			_callbackService = callbackService;
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
		}

		public event AsyncEventHandler InvalidatedAsync;
		public CodeLensDescriptor Descriptor { get; }

		public Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult(new CodeLensDataPointDescriptor {
				// TODO fill these out from CS agent
				Description = "avg duration: 3ms | throughput: 100rpm | error rate: 4epm - since 30min ago",
				// TODO
				TooltipText = $"",
				// no int value
				IntValue = null,
				//  ImageId = GetCommitTypeIcon(commit),
			});
		}

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<CodeLensDetailsDescriptor>(null);
		}

		public async Task ConnectToVisualStudioAsync(int vsPid) =>
			_visualStudioConnection = await VisualStudioConnectionHandler.CreateAsync(owner: this, vsPid).ConfigureAwait(false);

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);
	}
}
