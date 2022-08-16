using System;
using System.ComponentModel.Composition;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Language.Intellisense;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.SuggestedActions {
	[Export(typeof(ISuggestedActionsSourceProvider))]
	[Name(PredefinedCodestreamNames.CodemarkSuggestedActionsSourceProvider)]
	[ContentType(ContentTypes.Text)]
	internal class CodemarkSuggestedActionsSourceProvider : ISuggestedActionsSourceProvider {
		private readonly IServiceProvider _serviceProvider;
		private readonly ITextDocumentFactoryService _textDocumentFactoryService;

		[ImportingConstructor]
		internal CodemarkSuggestedActionsSourceProvider(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider,
			ITextDocumentFactoryService textDocumentFactoryService) {
			_serviceProvider = serviceProvider;
			_textDocumentFactoryService = textDocumentFactoryService;
		}

		public ISuggestedActionsSource CreateSuggestedActionsSource(ITextView textView, ITextBuffer textBuffer) {
			if (textBuffer == null || textView == null) return null;
			var wpfTextView = textView as IWpfTextView;
			if (wpfTextView == null) return null;
			if (!TextDocumentExtensions.TryGetTextDocument(_textDocumentFactoryService, wpfTextView, out IVirtualTextDocument virtualTextDocument)) return null;

			return new CodemarkSuggestedActionsSource((IComponentModel)_serviceProvider.GetService(typeof(SComponentModel)),
				textView, textBuffer, virtualTextDocument);
		}
	}
}
