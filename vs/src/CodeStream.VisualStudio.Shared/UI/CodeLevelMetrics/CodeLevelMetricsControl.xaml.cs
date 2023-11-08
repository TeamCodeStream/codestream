using System;
using System.Windows.Controls;
using System.Windows.Input;

using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Packages;
using CodeStream.VisualStudio.Shared.Services;

using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;

using Serilog;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	public partial class CodeLevelMetricsControl : UserControl
	{
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamService _codeStreamService;
		private static readonly ILogger Log = LogManager.ForContext<CodeLevelMetricsControl>();

		public CodeLevelMetricsControl(
			CodeLevelMetricsGlyph glyph,
			ISessionService sessionService,
			ICodeStreamService codeStreamService
		)
		{
			_sessionService = sessionService;
			_codeStreamService = codeStreamService;
			DataContext = glyph;
			InitializeComponent();
		}

		private void Glyph_OnMouseDown(object sender, MouseButtonEventArgs e)
		{
			if (
				!(sender is Image image)
				|| image.Name != "Glyph"
				|| !(DataContext is CodeLevelMetricsGlyph dataContext)
			)
			{
				e.Handled = true;
				return;
			}

			// Initiate the webview logic - but if the CodeStream dialog isn't shown, show it first.
			ThreadHelper.JoinableTaskFactory.Run(
				async delegate
				{
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

					try
					{
						var toolWindowProvider =
							Package.GetGlobalService(typeof(SToolWindowProvider))
							as IToolWindowProvider;
						if (!toolWindowProvider?.IsVisible(Guids.WebViewToolWindowGuid) ?? false)
						{
							if (!toolWindowProvider.ShowToolWindowSafe(Guids.WebViewToolWindowGuid))
							{
								Log.Warning("Could not activate tool window");
							}
						}

						if (_sessionService.WebViewDidInitialize == true)
						{
							_ = _codeStreamService.ViewMethodLevelTelemetryNotificationAsync(
								dataContext.Repo,
								dataContext.FunctionName,
								dataContext.NewRelicEntityGuid,
								dataContext.MetricTimesliceNameMapping
							);
						}
						else
						{
							var componentModel = (IComponentModel)
								Package.GetGlobalService(typeof(SComponentModel));
							var eventAggregator = componentModel.GetService<IEventAggregator>();
							IDisposable d = null;
							d = eventAggregator
								.GetEvent<WebviewDidInitializeEvent>()
								.Subscribe(s =>
								{
									try
									{
										_ =
											_codeStreamService.ViewMethodLevelTelemetryNotificationAsync(
												dataContext.Repo,
												dataContext.FunctionName,
												dataContext.NewRelicEntityGuid,
												dataContext.MetricTimesliceNameMapping
											);
										d?.Dispose();
									}
									catch (Exception ex)
									{
										Log.Error(ex, $"{nameof(Glyph_OnMouseDown)} event");
									}
								});
						}
					}
					catch (Exception ex)
					{
						Log.Error(ex, nameof(Glyph_OnMouseDown));
					}
				}
			);

			e.Handled = true;
		}
	}
}
