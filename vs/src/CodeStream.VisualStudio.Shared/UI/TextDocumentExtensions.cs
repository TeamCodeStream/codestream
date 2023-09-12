using System;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public static class TextDocumentExtensions
	{
		/// <summary>
		/// Don't get a textDocument if our secret LSP file is trying to be opened
		/// </summary>
		/// <param name="textDocumentFactoryService"></param>
		/// <param name="textBuffer"></param>
		/// <param name="textDocument"></param>
		/// <returns></returns>
		private static bool TryGetTextDocument(
			this ITextDocumentFactoryService textDocumentFactoryService,
			ITextBuffer textBuffer,
			out IVirtualTextDocument textDocument
		)
		{
			textDocument = null;
			if (!textDocumentFactoryService.TryGetTextDocument(textBuffer, out ITextDocument td))
			{
				return false;
			}

			textDocument = VirtualTextDocument.FromTextDocument(td);
			if (textDocument == null)
			{
				return false;
			}

			return !td.FilePath.EndsWithIgnoreCase(Core.Constants.CodeStreamCodeStream);
		}

		public static bool TryGetTextDocument(
			this ITextDocumentFactoryService textDocumentFactoryService,
			IWpfTextView textView,
			out IVirtualTextDocument textDocument
		)
		{
			textDocument = null;

			try
			{
				if (
					textView.Properties.TryGetProperty(
						PropertyNames.TextViewDocument,
						out textDocument
					)
				)
				{
					return textDocument != null;
				}
				// get all the buffers and try to find one that is attached to a document
				var subjectBuffers = textView?.BufferGraph.GetTextBuffers(_ => true);
				if (subjectBuffers == null)
				{
					if (
						!TryGetTextDocument(
							textDocumentFactoryService,
							textView.TextBuffer,
							out textDocument
						)
					)
					{
						return false;
					}
				}
				else
				{
					if (subjectBuffers.Count == 1 && subjectBuffers[0] == textView.TextBuffer)
					{
						if (
							!TryGetTextDocument(
								textDocumentFactoryService,
								textView.TextBuffer,
								out textDocument
							)
						)
						{
							return false;
						}
					}
					else
					{
						foreach (var buffer in subjectBuffers)
						{
							if (
								TryGetTextDocument(
									textDocumentFactoryService,
									buffer,
									out textDocument
								)
							)
							{
								break;
							}
						}
					}
				}
				return textDocument != null;
			}
			catch (Exception)
			{
				return false;
			}
		}
	}
}
