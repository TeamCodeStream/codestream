using System;
using System.Windows.Controls;
using System.Windows.Input;
using CodeStream.VisualStudio.Commands;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;

namespace CodeStream.VisualStudio.UI.ToolWindows {
	/// <summary>
	/// Interaction logic for CodeLevelMetricsDetails.xaml
	/// </summary>
	public partial class CodeLevelMetricsDetails : UserControl {
		private static readonly ILogger Log = LogManager.ForContext<RequestCodeReviewCommand>();
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamService _codeStreamService;

		public CodeLevelMetricsDetails(ISessionService sessionService, ICodeStreamService codeStreamService) {
			_sessionService = sessionService;
			_codeStreamService = codeStreamService;

			InitializeComponent();
		}

		private void ViewMore_OnMouseDown(object sender, MouseButtonEventArgs e) {
			if(!(sender is StackPanel panel) || panel.Name != "ViewMore") {
				e.Handled = true;
				return;
			}

			var dataContext = DataContext as CodeLevelMetricsData;

			// Initiate the webview logic - but if the CodeStream dialog isn't shown, show it first.
			ThreadHelper.JoinableTaskFactory.Run(async delegate {
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

				try {
					var toolWindowProvider =
						Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
					if (!toolWindowProvider.IsVisible(Guids.WebViewToolWindowGuid)) {
						if (!toolWindowProvider.ShowToolWindowSafe(Guids.WebViewToolWindowGuid)) {
							Log.Warning("Could not activate tool window");
						}
					}

					if (_sessionService.WebViewDidInitialize == true) {
						_ = _codeStreamService.ViewMethodLevelTelemetryNotificationAsync(dataContext.Repo, dataContext.FunctionName, dataContext.NewRelicEntityGuid, dataContext.MetricTimeSliceNameMapping);
					}
					else {
						var componentModel = (IComponentModel)Package.GetGlobalService(typeof(SComponentModel));
						var eventAggregator = componentModel.GetService<IEventAggregator>();
						IDisposable d = null;
						d = eventAggregator.GetEvent<WebviewDidInitializeEvent>().Subscribe(s => {
							try {
								_ = _codeStreamService.ViewMethodLevelTelemetryNotificationAsync(dataContext.Repo, dataContext.FunctionName, dataContext.NewRelicEntityGuid, dataContext.MetricTimeSliceNameMapping);
								d?.Dispose();
							}
							catch (Exception ex) {
								Log.Error(ex, $"{nameof(ViewMore_OnMouseDown)} event");
							}
						});
					}
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(ViewMore_OnMouseDown));
				}
			});

			e.Handled = true;
		}
	}
}
