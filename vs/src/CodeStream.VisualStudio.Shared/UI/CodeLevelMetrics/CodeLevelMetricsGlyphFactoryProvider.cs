using System.ComponentModel.Composition;

using CodeStream.VisualStudio.Shared.UI.Margins;

using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	[Export(typeof(IGlyphFactoryProvider))]
	[Name("CodeLevelMetricsGlyph")]
	[ContentType("code")]
	[Order(After = "VsTextMarker")]
	[TagType(typeof(CodeLevelMetricsGlyph))]
	internal sealed class CodeLevelMetricsGlyphFactoryProvider : IGlyphFactoryProvider
	{
		public IGlyphFactory GetGlyphFactory(IWpfTextView view, IWpfTextViewMargin margin) =>
			margin.GetType() == typeof(DocumentMarkMargin)
				? new CodeLevelMetricsGlyphFactory()
				: null;
	}
}
