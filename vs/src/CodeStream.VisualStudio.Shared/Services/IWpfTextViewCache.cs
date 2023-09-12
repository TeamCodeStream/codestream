using System.Runtime.InteropServices;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Shared.Services
{
	[Guid("56467630-0C95-4CDE-857A-E59AC6FDB852")]
	public interface IWpfTextViewCache
	{
		void Add(IVirtualTextDocument key, IWpfTextView wpfTextView);
		void Remove(IVirtualTextDocument key, IWpfTextView wpfTextView);
		bool TryGetValue(IVirtualTextDocument key, out IWpfTextView wpfTextView);
		int Count();
	}
}
