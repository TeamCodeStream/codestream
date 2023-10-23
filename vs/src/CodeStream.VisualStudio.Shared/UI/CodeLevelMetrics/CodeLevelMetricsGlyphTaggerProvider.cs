using System;

using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

using System.ComponentModel.Composition;

using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	[Export(typeof(ITaggerProvider))]
	[ContentType("code")]
	[TagType(typeof(CodeLevelMetricsGlyph))]
	internal class CodeLevelMetricsGlyphTaggerProvider : ITaggerProvider
	{
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;

		private readonly IVsSolution _vsSolution;

		[ImportingConstructor]
		public CodeLevelMetricsGlyphTaggerProvider(
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService,
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider
		)
		{
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;

			_vsSolution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
			Assumes.Present(_vsSolution);
		}

		public ITagger<T> CreateTagger<T>(ITextBuffer buffer)
			where T : ITag
		{
			if (buffer == null)
			{
				throw new ArgumentNullException(nameof(buffer));
			}

			return new CodeLevelMetricsGlyphTagger(
					_codeStreamAgentService,
					_sessionService,
					_vsSolution
				) as ITagger<T>;
		}
	}
}
