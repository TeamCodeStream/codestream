using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;

using System.Windows;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal sealed class CodeLevelMetricsGlyphFactory : IGlyphFactory
	{
		public UIElement GenerateGlyph(IWpfTextViewLine line, IGlyphTag tag)
		{
			if (!(tag is CodeLevelMetricsGlyph codeLevelMetricsGlyph))
			{
				return null;
			}

			var control = new CodeLevelMetricsControl(codeLevelMetricsGlyph);

			return control;
		}
	}
}
