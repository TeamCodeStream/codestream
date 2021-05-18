using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using System.Windows.Media;

namespace CodeStream.VisualStudio.UI.Margins
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
        bool IsReady();
        bool CanToggleMargin { get; }
        void OnSessionLogout();
        void OnSessionReady();
        void OnMarkerChanged();
		void OnZoomChanged(double zoomLevel, Transform transform);
        bool TryHideMargin();
		bool TryShowMargin();
		void SetAutoHideMarkers(bool autoHideMarkers);
		void ToggleMargin(bool requestingVisibility);
        void RefreshMargin();
        void OnTextViewLayoutChanged(object sender, TextViewLayoutChangedEventArgs e);
    }
}
