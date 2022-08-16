using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Core.Adornments {
	public static class ActiveTextEditorExtensions {
		public static HighlightAdornmentManager GetHighlightAdornmentManager(this ActiveTextEditor editor) {
			if (editor == null || editor.WpfTextView == null) return null;

			HighlightAdornmentManager ham = null;
			if (editor.WpfTextView?.Properties.TryGetProperty(PropertyNames.AdornmentManager, out ham) ==
				true) {
				return ham;
			}

			return null;
		}
	}
}
