using System;

using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

using System.ComponentModel.Composition;

using CodeStream.VisualStudio.Shared.Services;

using Microsoft.VisualStudio.Shell;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	[Export(typeof(ITaggerProvider))]
	[ContentType("code")]
	[TagType(typeof(CodeLevelMetricsGlyph))]
	internal class CodeLevelMetricsGlyphTaggerProvider : ITaggerProvider
	{
		private readonly IServiceProvider _serviceProvider;
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;

		[ImportingConstructor]
		public CodeLevelMetricsGlyphTaggerProvider(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider,
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService
		)
		{
			_serviceProvider = serviceProvider;
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;
		}

		public ITagger<T> CreateTagger<T>(ITextBuffer buffer)
			where T : ITag
		{
			if (buffer == null)
			{
				throw new ArgumentNullException(nameof(buffer));
			}

			return new CodeLevelMetricsGlyphTagger(
					_serviceProvider,
					_codeStreamAgentService,
					_sessionService
				) as ITagger<T>;
		}
	}
}
