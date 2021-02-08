using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Packages;
using CodeStream.VisualStudio.Core.Services;
// using CodeStream.VisualStudio.UI.Extensions;
using Microsoft.VisualStudio.ComponentModelHost;
using Serilog;

namespace CodeStream.VisualStudio.UI.Margins {
	// ReSharper disable once RedundantExtendsListEntry
	public partial class DocumentMark : UserControl {
		private static readonly ILogger Log = LogManager.ForContext<DocumentMark>();
		private static int _defaultHeight = 19;
		private readonly DocumentMarkViewModel _viewModel;
		// private static int FadeInDefault = 200;

		public DocumentMark(DocumentMarkViewModel viewModel) {
			//Default height used for repositioning in the margin
			Height = _defaultHeight;
			_viewModel = viewModel;
			InitializeComponent();
			DataContext = this;

			var color = _viewModel.Marker?.Color;
			if (color.IsNullOrWhiteSpace() == true) {
				color = "blue";
			}
			// this.FadeIn(FadeInDefault);

			// WTF I cannot get this to be "prcomment" OR "pull-request", using "comment" instead... going insane here...
			var type = _viewModel.Marker.Type == CodemarkType.Prcomment ? "comment" : _viewModel.Marker.Type.ToString();			 
			ImageUri = $"pack://application:,,,/CodeStream.VisualStudio;component/Resources/Assets/marker-{type}-{color}.png";
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

		// ReSharper disable once MemberCanBePrivate.Global
		public string ImageUri {
			get => (string)GetValue(ImageUriProperty);
			set => SetValue(ImageUriProperty, value);
		}

		// ReSharper disable once UnusedMember.Global
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
