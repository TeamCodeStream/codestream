using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;
using Microsoft.VisualStudio.Utilities;
using System;
using System.ComponentModel.Composition;
using System.Threading;
using System.Threading.Tasks;

namespace CodeLensOopProvider {
	[Export(typeof(IAsyncCodeLensDataPointProvider))]
	[Name(Id)]
	[ContentType("code")]
    // TODO change this name
	[LocalizedName(typeof(Resources), "GitCommitCodeLensProvider")]
	[Priority(200)]
	internal class GitCommitDataPointProvider : IAsyncCodeLensDataPointProvider {
        // TODO change this Id
		internal const string Id = "GitCommit";

		public Task<bool> CanCreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<bool>(true);
		}

		public Task<IAsyncCodeLensDataPoint> CreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<IAsyncCodeLensDataPoint>(new GitCommitDataPoint(descriptor));
		}

		private class GitCommitDataPoint : IAsyncCodeLensDataPoint {
			private readonly CodeLensDescriptor descriptor;

			private readonly string gitRepoRootPath;

			public GitCommitDataPoint(CodeLensDescriptor descriptor) {
				this.descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
			}

			public event AsyncEventHandler InvalidatedAsync;

			public CodeLensDescriptor Descriptor => this.descriptor;

			public Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {

				CodeLensDataPointDescriptor response = new CodeLensDataPointDescriptor() {
					Description = "avg duration: 3ms | throughput: 100rpm | error rate: 4epm - since 30min ago",
					TooltipText = $"",
					IntValue = null,    // no int value
										//  ImageId = GetCommitTypeIcon(commit),
				};

				return Task.FromResult(response);
			}

			public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
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
