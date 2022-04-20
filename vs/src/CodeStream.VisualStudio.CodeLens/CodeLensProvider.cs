using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;
using Microsoft.VisualStudio.Utilities;
using System;
using System.ComponentModel.Composition;
using System.Threading;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.CodeLens {
	[Export(typeof(IAsyncCodeLensDataPointProvider))]
	[Name(Id)]
	// TODO only allow python
	[ContentType("code")]
	[LocalizedName(typeof(Resources), "GitCommitCodeLensProvider")]
	[Priority(210)]
	internal class CodeLensProvider : IAsyncCodeLensDataPointProvider {
        
		internal const string Id = "CodeStreamCodeLevelMetrics";

		public Task<bool> CanCreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			// TODO logged in logic here
			return Task.FromResult<bool>(true);
		}

		public Task<IAsyncCodeLensDataPoint> CreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<IAsyncCodeLensDataPoint>(new GitCommitDataPoint(descriptor));
		}

		private class GitCommitDataPoint : IAsyncCodeLensDataPoint {
			private readonly CodeLensDescriptor _descriptor;

			public GitCommitDataPoint(CodeLensDescriptor descriptor) {
				this._descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
			}

			public event AsyncEventHandler InvalidatedAsync;

			public CodeLensDescriptor Descriptor => this._descriptor;

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
				// TODO figure out how to open the webview
				return Task.FromResult<CodeLensDetailsDescriptor>(null);
			}

			/// <summary>
			/// Raises <see cref="IAsyncCodeLensDataPoint.Invalidated"/> event.
			/// </summary>
			/// <remarks>
			///  This is not part of the IAsyncCodeLensDataPoint interface.
			///  The data point source can call this method to notify the client proxy that data for this data point has changed.
			/// </remarks>
			public void Invalidate() {
				this.InvalidatedAsync?.Invoke(this, EventArgs.Empty).ConfigureAwait(false);
			}
		}
	}
}
