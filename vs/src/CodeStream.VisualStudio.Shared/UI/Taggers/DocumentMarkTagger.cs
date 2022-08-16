using System;
using System.Collections.Generic;
using System.Linq;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.Shared.UI.Glyphs;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;

namespace CodeStream.VisualStudio.Shared.UI.Taggers {
	/// <summary>
	///     Responsible for matching Codemarks up to a line
	/// </summary>
	internal class DocumentMarkTagger : ITagger<DocumentMarkGlyphTag> {
		private readonly ISessionService _sessionService;
		private readonly ITextView _textView;
		private readonly ITextBuffer _buffer;

		public DocumentMarkTagger(ISessionService sessionService, ITextView textView, ITextBuffer buffer) {
			_sessionService = sessionService;
			_textView = textView;
			_buffer = buffer;
		}

#pragma warning disable 67
		public event EventHandler<SnapshotSpanEventArgs> TagsChanged;
#pragma warning restore 67

		IEnumerable<ITagSpan<DocumentMarkGlyphTag>> ITagger<DocumentMarkGlyphTag>.GetTags(NormalizedSnapshotSpanCollection spans) {
			if (_sessionService == null || !_sessionService.IsReady) yield break;

			_textView.Properties.TryGetProperty(PropertyNames.DocumentMarkers, out List<DocumentMarker> markers);
			if (markers == null || markers?.AnySafe() == false) yield break;

			foreach (var span in spans) {
				var marker = markers.FirstOrDefault(_ => _?.Range?.Start.Line == span.Start.GetContainingLine().LineNumber);
				if (marker == null) continue;
				
				yield return new TagSpan<DocumentMarkGlyphTag>(
					new SnapshotSpan(span.Start == 0 ? span.Start : span.Start - 1, 1),
					new DocumentMarkGlyphTag(marker)
				);
			}
		}
	}
}
