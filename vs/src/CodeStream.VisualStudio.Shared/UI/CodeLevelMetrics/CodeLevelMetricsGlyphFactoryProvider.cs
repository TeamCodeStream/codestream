using System.ComponentModel.Composition;

using CodeStream.VisualStudio.Shared.Services;
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
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamService _codeStreamService;

		[ImportingConstructor]
		public CodeLevelMetricsGlyphFactoryProvider(
			ISessionService sessionService,
			ICodeStreamService codeStreamService
		)
		{
			_sessionService = sessionService;
			_codeStreamService = codeStreamService;
		}

		public IGlyphFactory GetGlyphFactory(IWpfTextView view, IWpfTextViewMargin margin) =>
			margin is DocumentMarkMargin
				? new CodeLevelMetricsGlyphFactory(_sessionService, _codeStreamService)
				: null;
	}
}
