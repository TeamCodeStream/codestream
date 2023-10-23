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
	[Order(After = PredefinedMarginNames.Glyph)]
	[MarginContainer(PredefinedMarginNames.Left)]
	[ContentType("text")]
	[TextViewRole(PredefinedTextViewRoles.Interactive)]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
	[TextViewRole(PredefinedTextViewRoles.Editable)]
	public class CodeLevelMetricsMarginProvider : IWpfTextViewMarginProvider
	{
		private readonly IGlyphFactoryProvider _glyphFactoryProvider;
		private readonly IViewTagAggregatorFactoryService _viewTagAggregatorFactoryService;

		[ImportingConstructor]
		public CodeLevelMetricsMarginProvider(
			IViewTagAggregatorFactoryService viewTagAggregatorFactoryService,
			[ImportMany] IEnumerable<IGlyphFactoryProvider> glyphFactoryProviders
		)
		{
			_viewTagAggregatorFactoryService = viewTagAggregatorFactoryService;

			// only get _our_ glyph factory
			_glyphFactoryProvider = glyphFactoryProviders.SingleOrDefault(
				gfp => gfp.GetType().Name == nameof(CodeLevelMetricsGlyphFactoryProvider)
			);
		}

		// Implement the IWpfTextViewMarginProvider interface
		public IWpfTextViewMargin CreateMargin(
			IWpfTextViewHost wpfTextViewHost,
			IWpfTextViewMargin marginContainer
		) =>
			new CodeLevelMetricsMargin(
				wpfTextViewHost,
				_glyphFactoryProvider,
				_viewTagAggregatorFactoryService
			);
	}
}
