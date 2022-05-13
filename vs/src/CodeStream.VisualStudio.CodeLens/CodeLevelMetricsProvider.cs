using System;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Utilities;
using System.ComponentModel.Composition;
using System.Threading;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.CodeLens {
	[Export(typeof(IAsyncCodeLensDataPointProvider))]
	[Name(Id)]
	[ContentType("CSharp")]
	[LocalizedName(typeof(Resources), Id)]
	[Priority(210)]
	public class CodeLevelMetricsProvider : IAsyncCodeLensDataPointProvider {
		internal const string Id = "CodeStreamCodeLevelMetrics";
		private readonly Lazy<ICodeLensCallbackService> _callbackService;

		//[ImportingConstructor]
  //      public CodeLevelMetricsProvider(Lazy<ICodeLensCallbackService> callbackService) {
		//	Debugger.Launch();

		//	_callbackService = callbackService;
  //      }
		
		public Task<bool> CanCreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			return Task.FromResult<bool>(true);
		}

		public async Task<IAsyncCodeLensDataPoint> CreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			var vsPid = 223; // await _callbackService.Value.InvokeAsync<int>(this, nameof(ICodeLevelMetricsListener.GetVisualStudioPid), cancellationToken: token).ConfigureAwait(false);

			return await Task.FromResult<IAsyncCodeLensDataPoint>(new CodeLevelMetricDataPoint(descriptor, vsPid));
		}
	}
}
