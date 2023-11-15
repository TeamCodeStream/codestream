using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using System.Windows.Media;

namespace CodeStream.VisualStudio.Shared.UI.Margins
{
	/// <summary>
	/// Marker interface
	/// </summary>
	public interface ICodeStreamMarginProvider : IWpfTextViewMarginProvider
	{
		ITextDocumentFactoryService TextDocumentFactoryService { get; set; }
		ICodeStreamWpfTextViewMargin TextViewMargin { get; }
	}

	public interface ICodeStreamWpfTextViewMargin : IWpfTextViewMargin
	{
		bool CanToggleMargin { get; }
		void OnSessionLogout();
		void OnSessionReady();
		void OnMarkerChanged();
		void OnZoomChanged(double zoomLevel, Transform transform);
		bool TryHideMargin();
		void ToggleMargin(bool requestingVisibility);
		void OnTextViewLayoutChanged(object sender, TextViewLayoutChangedEventArgs e);
		void RefreshMargin();
	}
}
