using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Linq;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.UI.Extensions;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;
using Serilog;
using Serilog.Events;

namespace CodeStream.VisualStudio.UI.Margins {
	[Export(typeof(IWpfTextViewMarginProvider))]
	[Name(PredefinedCodestreamNames.DocumentMarkTextViewMargin)]
	[Order(After = PredefinedMarginNames.Glyph)]
	[MarginContainer(PredefinedMarginNames.Left)]
	[ContentType(ContentTypes.Text)]
	[TextViewRole(PredefinedTextViewRoles.Interactive)]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
	[TextViewRole(PredefinedTextViewRoles.Editable)]
	internal sealed class DocumentMarkMarginProvider : ICodeStreamMarginProvider {
		private readonly ILogger Log = LogManager.ForContext<DocumentMarkMarginProvider>();
		private readonly IViewTagAggregatorFactoryService _viewTagAggregatorFactoryService;
		private readonly Lazy<IGlyphFactoryProvider, IGlyphMetadata>[] _glyphFactoryProviders;

		[ImportingConstructor]
		public DocumentMarkMarginProvider(IViewTagAggregatorFactoryService viewTagAggregatorFactoryService,
			[ImportMany] IEnumerable<Lazy<IGlyphFactoryProvider, IGlyphMetadata>> glyphFactoryProviders) {
			_viewTagAggregatorFactoryService = viewTagAggregatorFactoryService;

			// only get _our_ glyph factory
			_glyphFactoryProviders = Orderer.Order(glyphFactoryProviders)
				.Where(_ => _.Metadata.Name == PredefinedCodestreamNames.DocumentMarkGlyphFactoryProvider).ToArray();
		}

		[Import]
		public ITextDocumentFactoryService TextDocumentFactoryService { get; set; }

		[Import]
		public Lazy<ISessionService> SessionService { get; set; }

		[Import]
		public Lazy<ISettingsServiceFactory> SettingsServiceFactory { get; set; }

		public IWpfTextViewMargin CreateMargin(IWpfTextViewHost wpfTextViewHost, IWpfTextViewMargin parent) {
			try {
				if (wpfTextViewHost == null || !wpfTextViewHost.TextView.HasValidMarginRoles()) return null;
				if (!TextDocumentExtensions.TryGetTextDocument(TextDocumentFactoryService,
					wpfTextViewHost.TextView, out var textDocument)) {
					return null;
				}

				using (Log.CriticalOperation($"{nameof(DocumentMarkMarginProvider)} {nameof(CreateMargin)}", LogEventLevel.Debug)) {
					TextViewMargin = new DocumentMarkMargin(
						_viewTagAggregatorFactoryService,
						_glyphFactoryProviders,
						wpfTextViewHost, SessionService.Value, SettingsServiceFactory.Value.GetOrCreate
							(nameof(DocumentMarkMarginProvider))
					);

					return TextViewMargin;
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CreateMargin));
				System.Diagnostics.Debug.WriteLine(ex);
#if DEBUG
				System.Diagnostics.Debugger.Break();
#endif
				return null;
			}
		}

		public ICodeStreamWpfTextViewMargin TextViewMargin { get; private set; }
	}
}
