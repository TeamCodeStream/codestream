using System;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Utilities;
using System.ComponentModel.Composition;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.Intellisense;

namespace CodeStream.VisualStudio.CodeLens {
	[Export(typeof(IAsyncCodeLensDataPointProvider))]
	[Name(Id)]
	[ContentType("CSharp")]
	[LocalizedName(typeof(Resources), Id)]
	[Priority(210)]
	public class CodeLevelMetricsProvider : IAsyncCodeLensDataPointProvider {
		internal const string Id = "CodeStreamCodeLevelMetrics";
		private readonly Lazy<ICodeLensCallbackService> _callbackService;

		[ImportingConstructor]
		public CodeLevelMetricsProvider(Lazy<ICodeLensCallbackService> callbackService) {
			_callbackService = callbackService;
        }
		
		public async Task<bool> CanCreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			Debugger.Launch();

			var methodsOnly = descriptor.Kind == CodeElementKinds.Method;

			// bail early so we don't have the cost associated with RPC calls.
			if (!methodsOnly) {
				return false;
			}

			var isClmReady = await _callbackService.Value.InvokeAsync<bool>(this, nameof(ICodeLevelMetricsListener.IsClmReady), cancellationToken: token).ConfigureAwait(false);
			return isClmReady;
		}

		public async Task<IAsyncCodeLensDataPoint> CreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			var dataPoint = new CodeLevelMetricDataPoint(_callbackService.Value, descriptor);

			var vsPid = await _callbackService.Value
				.InvokeAsync<int>(this, nameof(ICodeLevelMetricsListener.GetVisualStudioPid), cancellationToken: token).ConfigureAwait(false);

			await dataPoint.ConnectToVisualStudioAsync(vsPid).ConfigureAwait(false);

			return dataPoint;
		}
	}
}
