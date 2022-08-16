using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.Text;
using System;
using System.IO;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
	public class VirtualTextDocument : IVirtualTextDocument {
		private readonly ITextDocument _textDocument;
		private VirtualTextDocument(ITextDocument textDocument) {
			_textDocument = textDocument;
			if (CodeStreamDiffUri.TryParse(_textDocument.FilePath, out CodeStreamDiffUri uri)) {
				Uri = uri.Uri;
				Id = uri.Uri.ToLocalPath();
				FileName = uri.FileName;
				SupportsMarkers = SupportsMargins = false;
			}
			else {
				Uri = _textDocument.FilePath.ToUri();
				Id = Uri?.ToLocalPath();
				FileName = Path.GetFileName(_textDocument.FilePath);
				SupportsMarkers = SupportsMargins = true;
			}
		}

		private VirtualTextDocument(Uri uri) {
			Uri = uri;
			Id = uri.ToLocalPath();
			FileName = Id;
			SupportsMarkers = SupportsMargins = uri.Scheme != "codestream-diff";
		}

		public static VirtualTextDocument FromTextDocument(ITextDocument textDocument) {
			return new VirtualTextDocument(textDocument);
		}

		public static VirtualTextDocument FromUri(Uri uri) {
			return new VirtualTextDocument(uri);
		}

		public string Id { get; }
		public Uri Uri { get; }
		public bool SupportsMarkers { get; }
		public bool SupportsMargins { get; }

		/// <summary>
		/// the name of the file
		/// </summary>
		public string FileName { get; }
	}
}
