using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Shared.UI.Glyphs
{
    internal class DocumentMarkGlyphTag : IGlyphTag
    {
        public DocumentMarker DocumentMarker { get; }

        public DocumentMarkGlyphTag(DocumentMarker documentMarker)
        {
            DocumentMarker = documentMarker;
        }
    }
}
