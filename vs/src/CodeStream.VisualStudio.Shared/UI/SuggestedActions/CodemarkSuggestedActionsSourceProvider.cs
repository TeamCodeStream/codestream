using System;
using System.ComponentModel.Composition;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Services;

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
		private readonly IIdeService _ideService;

		[ImportingConstructor]
		internal CodemarkSuggestedActionsSourceProvider(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider,
			ITextDocumentFactoryService textDocumentFactoryService,
			IIdeService ideService) {
			_serviceProvider = serviceProvider;
			_textDocumentFactoryService = textDocumentFactoryService;
			_ideService = ideService;
		}

		public ISuggestedActionsSource CreateSuggestedActionsSource(ITextView textView, ITextBuffer textBuffer) {
			if (textBuffer == null || textView == null)
			{
				return null;
			}

			if (!(textView is IWpfTextView wpfTextView))
			{
				return null;
			}

			if (!_textDocumentFactoryService.TryGetTextDocument(wpfTextView, out var virtualTextDocument))
			{
				return null;
			}

			var componentModel = (IComponentModel)_serviceProvider.GetService(typeof(SComponentModel));

			return new CodemarkSuggestedActionsSource(
				componentModel,
				_ideService,
				textView, 
				textBuffer,
				virtualTextDocument);
		}
	}
}
