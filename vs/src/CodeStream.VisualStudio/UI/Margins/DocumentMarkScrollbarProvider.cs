using System;
using System.ComponentModel.Composition;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.UI.Extensions;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;
using Serilog;
using Serilog.Events;

namespace CodeStream.VisualStudio.UI.Margins {
	[Export(typeof(IWpfTextViewMarginProvider))]
	[MarginContainer(PredefinedMarginNames.VerticalScrollBar)]
	[Name(PredefinedCodestreamNames.DocumentMarkScrollbar)]
	[Order(After = PredefinedMarginNames.OverviewChangeTracking, Before = PredefinedMarginNames.OverviewMark)]
	[ContentType(ContentTypes.Text)]
	[TextViewRole(PredefinedTextViewRoles.Interactive)]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
	[TextViewRole(PredefinedTextViewRoles.Editable)]
	// [DeferCreation(OptionName = MatchMarginEnabledOption.OptionName)]
	internal sealed class DocumentMarkScrollbarProvider : ICodeStreamMarginProvider {
		private readonly ILogger Log = LogManager.ForContext<DocumentMarkScrollbarProvider>();

#pragma warning disable 649
		[Export]
		[Name("DocumentMarkScrollbarAdornmentLayer")]
		[Order(After = PredefinedAdornmentLayers.Outlining, Before = PredefinedAdornmentLayers.Selection)]
		internal AdornmentLayerDefinition MatchLayerDefinition;
#pragma warning restore 649

		[Import]
		public ITextDocumentFactoryService TextDocumentFactoryService { get; set; }

		[Import]
		public Lazy<ISessionService> SessionService { get; set; }

		public IWpfTextViewMargin CreateMargin(IWpfTextViewHost wpfTextViewHost, IWpfTextViewMargin containerMargin) {
			try {
				var containerMarginAsVerticalScrollBar = containerMargin as IVerticalScrollBar;
				if (containerMarginAsVerticalScrollBar == null) return null;

				if (!wpfTextViewHost.TextView.HasValidMarginRoles()) return null;
				if (!TextDocumentExtensions.TryGetTextDocument(TextDocumentFactoryService,
					wpfTextViewHost.TextView, out var textDocument)) return null;

				using (Log.CriticalOperation($"{nameof(DocumentMarkScrollbarProvider)} {nameof(CreateMargin)}", LogEventLevel.Debug)) {
					TextViewMargin = new DocumentMarkScrollbar(
						wpfTextViewHost,
						containerMarginAsVerticalScrollBar, SessionService.Value
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
			}

			return null;
		}

		public ICodeStreamWpfTextViewMargin TextViewMargin { get; private set; }
	}
}
