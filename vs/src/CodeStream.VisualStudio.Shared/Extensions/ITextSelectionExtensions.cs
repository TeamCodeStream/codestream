using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Shared.Extensions {
	public static class ITextSelectionExtensions {
		public static string ToPositionString(this ITextSelection textSelection) {
			return textSelection == null ?
				null :
				$"{textSelection?.Start.Position.Position},{textSelection?.End.Position.Position}";
		}
	}
}
