using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Linq;

using CodeStream.VisualStudio.Shared.UI.Margins;

using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	[Export(typeof(IWpfTextViewMarginProvider))]
	[Name("CodeLevelMetricsMargin")]
	[MarginContainer(PredefinedMarginNames.Left)]
	[Order(After = PredefinedMarginNames.Glyph)]
	[ContentType("text")]
	[TextViewRole(PredefinedTextViewRoles.Interactive)]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
	[TextViewRole(PredefinedTextViewRoles.Editable)]
	public class CodeLevelMetricsMarginProvider : IWpfTextViewMarginProvider
	{
		private readonly IViewTagAggregatorFactoryService _viewTagAggregatorFactoryService;
		private readonly IGlyphFactoryProvider _glyphFactoryProvider;

		[ImportingConstructor]
		public CodeLevelMetricsMarginProvider(
			IViewTagAggregatorFactoryService viewTagAggregatorFactoryService,
			[ImportMany]
				IEnumerable<Lazy<IGlyphFactoryProvider, IGlyphMetadata>> glyphFactoryProviders
		)
		{
			_viewTagAggregatorFactoryService = viewTagAggregatorFactoryService;

			// only get _our_ glyph factory
			_glyphFactoryProvider = glyphFactoryProviders
				.Where(x => x.Value is CodeLevelMetricsGlyphFactoryProvider)
				.Select(x => x.Value)
				.SingleOrDefault();
		}

		// Implement the IWpfTextViewMarginProvider interface
		public IWpfTextViewMargin CreateMargin(
			IWpfTextViewHost wpfTextViewHost,
			IWpfTextViewMargin marginContainer
		)
		{
			var tagAggregator =
				_viewTagAggregatorFactoryService.CreateTagAggregator<CodeLevelMetricsGlyph>(
					wpfTextViewHost.TextView
				);

			return new CodeLevelMetricsMargin(
				wpfTextViewHost,
				tagAggregator,
				_glyphFactoryProvider
			);
		}
	}
}
