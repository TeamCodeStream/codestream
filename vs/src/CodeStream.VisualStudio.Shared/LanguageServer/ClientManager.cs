using CodeStream.VisualStudio.Core.Logging;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Serilog;
using System;
using System.ComponentModel.Composition;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared.LanguageServer {
	[Export(typeof(ILanguageServerClientManager))]
	public class LanguageServerClient2019Manager : ILanguageServerClientManager {
		private static readonly ILogger Log = LogManager.ForContext<LanguageServerClient2019Manager>();
		IServiceProvider _serviceProvider;

		[ImportingConstructor]
		public LanguageServerClient2019Manager(
		[Import(typeof(Microsoft.VisualStudio.Shell.SVsServiceProvider))] IServiceProvider serviceProvider) {
			_serviceProvider = serviceProvider;
		}

		public async Task RestartAsync() {
			using (Log.CriticalOperation(nameof(RestartAsync), Serilog.Events.LogEventLevel.Debug)) {
				try {
					var componentModel = _serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(componentModel);
					var client = componentModel.GetService<ICodestreamLanguageClient>();

					await client.RestartAsync();
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(RestartAsync));
				}
			}
			await Task.CompletedTask;
		}
	}
}
