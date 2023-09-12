using System;

namespace CodeStream.VisualStudio.Core.Models
{
	public interface IVirtualTextDocument
	{
		Uri Uri { get; }
		string Id { get; }
		string FileName { get; }
		bool SupportsMarkers { get; }
		bool SupportsMargins { get; }
	}
}
