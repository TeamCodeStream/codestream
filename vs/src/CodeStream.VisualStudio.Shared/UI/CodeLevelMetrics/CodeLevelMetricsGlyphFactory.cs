using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;

using System.Windows;

using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal sealed class CodeLevelMetricsGlyphFactory : IGlyphFactory
	{
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamService _codeStreamService;

		public CodeLevelMetricsGlyphFactory(
			ISessionService sessionService,
			ICodeStreamService codeStreamService
		)
		{
			_sessionService = sessionService;
			_codeStreamService = codeStreamService;
		}

		public UIElement GenerateGlyph(IWpfTextViewLine line, IGlyphTag tag)
		{
			if (!(tag is CodeLevelMetricsGlyph codeLevelMetricsGlyph))
			{
				return null;
			}

			var control = new CodeLevelMetricsControl(
				codeLevelMetricsGlyph,
				_sessionService,
				_codeStreamService
			);

			return control;
		}
	}
}
