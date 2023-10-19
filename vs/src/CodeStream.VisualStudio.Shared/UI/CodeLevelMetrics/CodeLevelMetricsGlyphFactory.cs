using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;

using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal sealed class CodeLevelMetricsGlyphFactory : IGlyphFactory
	{
		public UIElement GenerateGlyph(IWpfTextViewLine line, IGlyphTag tag)
		{
			if (!(tag is CodeLevelMetricsGlyph yourGlyphTag))
			{
				return null;
			}

			return new Image
			{
				Source = BitmapFrame.Create(yourGlyphTag.Icon),
				Width = 16,
				Height = 16,
				Margin = new Thickness(1)
			};
		}
	}
}
