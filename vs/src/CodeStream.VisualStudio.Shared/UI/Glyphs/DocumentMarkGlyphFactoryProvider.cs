using System.ComponentModel.Composition;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Shared.UI.Margins;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.Glyphs
{
	[Export(typeof(IGlyphFactoryProvider))]
	[Name(PredefinedCodestreamNames.DocumentMarkGlyphFactoryProvider)]
	[ContentType(ContentTypes.Text)]
	[TagType(typeof(DocumentMarkGlyphTag))]
	internal sealed class DocumentMarkGlyphFactoryProvider : IGlyphFactoryProvider
	{
		public IGlyphFactory GetGlyphFactory(IWpfTextView view, IWpfTextViewMargin margin)
		{
			// only return the factory for our custom margin
			if (margin.GetType() != typeof(DocumentMarkMargin))
				return null;

			return new DocumentMarkGlyphFactory();
		}
	}
}
