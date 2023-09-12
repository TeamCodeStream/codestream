using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.Text;
using System;
using System.IO;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models
{
	public class VirtualTextDocument : IVirtualTextDocument
	{
		private readonly ITextDocument _textDocument;

		public string Id { get; }
		public Uri Uri { get; }
		public bool SupportsMarkers { get; }
		public bool SupportsMargins { get; }
		public string FileName { get; }

		private VirtualTextDocument(ITextDocument textDocument)
		{
			_textDocument = textDocument;

			if (FeedbackRequestDiffUri.TryParse(_textDocument.FilePath, out var frUri))
			{
				Uri = frUri.Uri;
				Id = frUri.Uri.NormalizePath();
				FileName = frUri.FileName;
				SupportsMarkers = SupportsMargins = false;
			}
			else if (PullRequestDiffUri.TryParse(_textDocument.FilePath, out var prUri))
			{
				Uri = prUri.Uri;
				Id = prUri.Uri.NormalizePath();
				FileName = prUri.Path;
				SupportsMarkers = SupportsMargins = false;
			}
			else
			{
				Uri = _textDocument.FilePath.ToUri();
				Id = Uri?.NormalizePath();
				FileName = Path.GetFileName(_textDocument.FilePath);
				SupportsMarkers = SupportsMargins = true;
			}
		}

		private VirtualTextDocument(Uri uri)
		{
			Uri = uri;
			Id = uri.NormalizePath();
			FileName = Id;
			SupportsMarkers = SupportsMargins = uri.Scheme != "codestream-diff";
		}

		public static VirtualTextDocument FromTextDocument(ITextDocument textDocument) =>
			new VirtualTextDocument(textDocument);

		public static VirtualTextDocument FromUri(Uri uri) => new VirtualTextDocument(uri);
	}
}
