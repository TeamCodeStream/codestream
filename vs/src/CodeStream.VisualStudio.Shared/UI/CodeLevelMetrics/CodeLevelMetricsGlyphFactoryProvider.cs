using System.ComponentModel.Composition;

using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	[Export(typeof(IGlyphFactoryProvider))]
	[Name("CodeLevelMetricsGlyph")]
	[Order(After = "VsTextMarker")]
	[ContentType("code")]
	[TagType(typeof(CodeLevelMetricsGlyph))]
	internal sealed class CodeLevelMetricsGlyphFactoryProvider : IGlyphFactoryProvider
	{
		public IGlyphFactory GetGlyphFactory(IWpfTextView view, IWpfTextViewMargin margin) =>
			new CodeLevelMetricsGlyphFactory();
	}
}
