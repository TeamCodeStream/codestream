using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Packages;
using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Serilog;

namespace CodeStream.VisualStudio.Shared.UI.Margins {
	public partial class DocumentMark : UserControl {
		private static readonly ILogger Log = LogManager.ForContext<DocumentMark>();
		private static int _defaultHeight = 19;
		private readonly DocumentMarkViewModel _viewModel;

		public DocumentMark(DocumentMarkViewModel viewModel) {
			//Default height used for repositioning in the margin
			Height = _defaultHeight;
			_viewModel = viewModel;
			InitializeComponent();
			DataContext = this;

			var markerColor = _viewModel.Marker?.Color;
			if (markerColor.IsNullOrWhiteSpace()) {
				markerColor = "blue";
			}

			if (_viewModel.Marker?.Type == CodemarkType.Prcomment) {
				markerColor = "green";
			}
			
			var markerType = _viewModel.Marker?.Type.ToString();

			var markerImage = $"marker-{markerType}-{markerColor}.png";

			#if X86
				ImageUri = $"pack://application:,,,/CodeStream.VisualStudio.Vsix.x86;component/resources/assets/{markerImage}";
			#else
				ImageUri = $"pack://application:,,,/CodeStream.VisualStudio.Vsix.x64;component/resources/assets/{markerImage}";
			#endif
		}

		protected override void OnMouseEnter(MouseEventArgs e) {
			base.OnMouseEnter(e);

			ToolTip = $"{_viewModel.Marker.CreatorName}, {_viewModel.Marker.CreateAtDateTime.TimeAgo()} ({_viewModel.Marker.CreateAtDateTime.ToDisplayDate()}) " +
					  $"{Environment.NewLine}{Environment.NewLine}" +
					  $"\t{_viewModel.Marker.Summary}" +
					  $"{Environment.NewLine}{Environment.NewLine}" +
					  $"Click to View {_viewModel.Marker.Type}";
		}

		public static readonly DependencyProperty ImageUriProperty =
			DependencyProperty.Register("ImageUri", typeof(string), typeof(DocumentMark));

		public static readonly DependencyProperty ImageTooltipProperty =
			DependencyProperty.Register("Tooltip", typeof(string), typeof(DocumentMark));

		public string ImageUri {
			get => (string)GetValue(ImageUriProperty);
			set => SetValue(ImageUriProperty, value);
		}

		public string Tooltip {
			get => (string)GetValue(ImageTooltipProperty);
			set => SetValue(ImageTooltipProperty, value);
		}

		private void DocumentMark_MouseDown(object sender, MouseButtonEventArgs e) {
			try {
				if (_viewModel?.Marker?.Codemark == null) return;

				if (!(Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(SToolWindowProvider)) is IToolWindowProvider toolWindowProvider)) return;

				if (!(Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(SComponentModel)) is IComponentModel componentModel)) {
					Log.Warning(nameof(componentModel));
					return;
				}

				var codeStreamService = componentModel.GetService<ICodeStreamService>();
				if (codeStreamService == null) return;

				if (toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid) == true) {

				}
				else {
					Log.Warning("Could not activate tool window");
				}

				var activeEditor = componentModel.GetService<IEditorService>()?.GetActiveTextEditor();
				var sessionService = componentModel.GetService<ISessionService>();
				if (sessionService.WebViewDidInitialize == true) {
					_ = codeStreamService.ShowCodemarkAsync(_viewModel.Marker.Codemark.Id, activeEditor?.Uri.ToLocalPath());
					Track(componentModel);
				}
				else {
					var eventAggregator = componentModel.GetService<IEventAggregator>();
					IDisposable d = null;
					d = eventAggregator?.GetEvent<WebviewDidInitializeEvent>().Subscribe(ev => {
						try {
							_ = codeStreamService.ShowCodemarkAsync(_viewModel.Marker.Codemark.Id, activeEditor?.Uri.ToLocalPath());
							Track(componentModel);
							d.Dispose();
						}
						catch (Exception ex) {
							Log.Error(ex, $"{nameof(DocumentMark_MouseDown)} event");
						}
					});
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(DocumentMark_MouseDown));
			}
		}


		private void Track(IComponentModel componentModel) {
			var codeStreamAgentService = componentModel.GetService<ICodeStreamAgentService>();
			_ = codeStreamAgentService?.TrackAsync(TelemetryEventNames.CodemarkClicked, new TelemetryProperties { { "Codemark Location", "Source File" } });
		}
	}
}
