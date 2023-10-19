using System;

using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	[Export(typeof(ITaggerProvider))]
	[ContentType("code")]
	[TagType(typeof(CodeLevelMetricsGlyph))]
	internal class CodeLevelMetricsGlyphTaggerProvider : ITaggerProvider
	{
		public ITagger<T> CreateTagger<T>(ITextBuffer buffer)
			where T : ITag
		{
			if (buffer == null)
			{
				throw new ArgumentNullException(nameof(buffer));
			}

			return new CodeLevelMetricsGlyphTagger() as ITagger<T>;
		}
	}
}
