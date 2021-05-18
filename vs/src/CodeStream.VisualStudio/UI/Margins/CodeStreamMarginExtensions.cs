using System.Collections.Generic;
using System.Windows.Media;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.UI.Margins {
	public static class CodeStreamMarginExtensions {
		public static void OnSessionReady(this List<ICodeStreamWpfTextViewMargin> items) =>
			items.ForEach(_ => _.OnSessionReady());

		public static void OnSessionLogout(this List<ICodeStreamWpfTextViewMargin> items) =>
			items.ForEach(_ => {
				_.TryHideMargin();
				_.OnSessionLogout();
			});

		public static void Toggle(this List<ICodeStreamWpfTextViewMargin> items, bool requestingVisibility)
			=> items.ForEach(_ => {
				if (_.CanToggleMargin) {
					_.ToggleMargin(requestingVisibility);
				}
			});

		public static void SetAutoHideMarkers(this List<ICodeStreamWpfTextViewMargin> items, bool autoHideMarkers)
		=> items.ForEach(_ => {
			_.SetAutoHideMarkers(autoHideMarkers);
		});

		public static void Hide(this List<ICodeStreamWpfTextViewMargin> items) =>
			items.ForEach(_ => _.TryHideMargin());

		public static void OnMarkerChanged(this List<ICodeStreamWpfTextViewMargin> margins) {
			// Avoids lambda creation on each iteration as this is a high-frequency event
			foreach (var margin in margins) {
				margin.OnMarkerChanged();
			}
		}

		public static void OnZoomChanged(this List<ICodeStreamWpfTextViewMargin> margins, double zoomLevel, Transform transform) {
			// Avoids lambda creation on each iteration as this is a high-frequency event
			foreach (var margin in margins) {
				margin.OnZoomChanged(zoomLevel, transform);
			}
		}

		public static void OnTextViewLayoutChanged(this List<ICodeStreamWpfTextViewMargin> margins, object sender, TextViewLayoutChangedEventArgs e) {
			// Avoids lambda creation on each iteration as this is a high-frequency event
			foreach (var margin in margins) {
				margin.OnTextViewLayoutChanged(sender, e);
			}
		}
	}
}
