using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.Text;
using System;
using System.IO;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
	public class VirtualTextDocument : IVirtualTextDocument {
		
		private VirtualTextDocument(ITextDocument textDocument) {
			if (DiffExtensions.IsTempFile(textDocument.FilePath))
			{
				Uri = new Uri(textDocument.FilePath);
				Id = new Uri(textDocument.FilePath).ToLocalPath();
				FileName = new Uri(textDocument.FilePath).ToFileName();
				SupportsMarkers = SupportsMargins = false;
			}
			else {
				Uri = textDocument.FilePath.ToUri();
				Id = Uri?.ToLocalPath();
				FileName = Path.GetFileName(textDocument.FilePath);
				SupportsMarkers = SupportsMargins = true;
			}
		}

		private VirtualTextDocument(Uri uri) {
			Uri = uri;
			Id = uri.ToLocalPath();
			FileName = Id;
			SupportsMarkers = SupportsMargins = !DiffExtensions.IsTempFile(uri.ToLocalPath());
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
