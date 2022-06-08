using System;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Utilities;
using System.ComponentModel.Composition;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared;
using CodeStream.VisualStudio.Shared.Interfaces;
using Microsoft.VisualStudio.Language.Intellisense;
using Serilog;

namespace CodeStream.VisualStudio.CodeLens {
	[Export(typeof(IAsyncCodeLensDataPointProvider))]
	[Name(Constants.CodeLevelMetrics.Provider.Id)]
	[ContentType("CSharp")]
	[LocalizedName(typeof(Resources), Constants.CodeLevelMetrics.Provider.Id)]
	[Priority(210)]
	public class CodeLevelMetricsProvider : IAsyncCodeLensDataPointProvider {
		private readonly Lazy<ICodeLensCallbackService> _callbackService;
		private static readonly ILogger Log = LogManager.ForContext<CodeLevelMetricsProvider>();

		[ImportingConstructor]
		public CodeLevelMetricsProvider(Lazy<ICodeLensCallbackService> callbackService) {
			_callbackService = callbackService;

			//Uncomment this if you want to debug any code in this project, since it runs OOP.
			//Debugger.Launch();
		}
		
		public Task<bool> CanCreateDataPointAsync(CodeLensDescriptor descriptor, CodeLensDescriptorContext context, CancellationToken token) {
			var methodsOnly = descriptor.Kind == CodeElementKinds.Method;
			return Task.FromResult(methodsOnly);
		}

		/// <summary>
		/// Responsible for creating the actual datapoint and setting up two-way communication over RPC back to the in-process extension
		/// </summary>
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
