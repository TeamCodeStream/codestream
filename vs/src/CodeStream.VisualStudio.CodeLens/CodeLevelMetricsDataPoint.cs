using System;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.CodeLens {
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint {
		public CodeLevelMetricDataPoint(CodeLensDescriptor descriptor, int vsPid) {
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
			VsPid = vsPid;
		}

		public event AsyncEventHandler InvalidatedAsync;

		public CodeLensDescriptor Descriptor { get; }
		public int VsPid { get; }

		public Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult(new CodeLensDataPointDescriptor {
				// TODO fill these out from CS agent
				Description = "avg duration: 3ms | throughput: 100rpm | error rate: 4epm - since 30min ago",
				// TODO
				TooltipText = $"The Visual Studio Process ID is '{VsPid}'",
				// no int value
				IntValue = null,
				//  ImageId = GetCommitTypeIcon(commit),
			});
		}

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<CodeLensDetailsDescriptor>(null);
		}

		/// <summary>
		/// Raises <see cref="IAsyncCodeLensDataPoint.InvalidatedAsync"/> event.
		/// </summary>
		/// <remarks>
		///  This is not part of the IAsyncCodeLensDataPoint interface.
		///  The data point source can call this method to notify the client proxy that data for this data point has changed.
		/// </remarks>
		public void Invalidate() {
			InvalidatedAsync?.Invoke(this, EventArgs.Empty).ConfigureAwait(false);
		}
	}
}
