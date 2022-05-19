using System;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Utilities;
using System.ComponentModel.Composition;
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
		
		public Task<bool> CanCreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			var methodsOnly = descriptor.Kind == CodeElementKinds.Method;

			return Task.FromResult(methodsOnly);
		}

		public async Task<IAsyncCodeLensDataPoint> CreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			var dataPoint = new CodeLevelMetricDataPoint(descriptor, _callbackService.Value);

			var vsPid = await _callbackService.Value
				.InvokeAsync<int>(this,
					nameof(ICodeLevelMetricsCallbackService.GetVisualStudioPid),
					cancellationToken: token)
				.ConfigureAwait(false);

			_ = _callbackService.Value
				.InvokeAsync(this, nameof(ICodeLevelMetricsCallbackService.InitializeRpcAsync),
					new[] { dataPoint.DataPointId }, token)
				.ConfigureAwait(false);

			var connection = new VisualStudioConnection(dataPoint, vsPid);
			await connection.ConnectAsync(token);
			dataPoint.VsConnection = connection;

			return dataPoint;
		}
	}
}
