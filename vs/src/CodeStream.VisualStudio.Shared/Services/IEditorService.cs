using System;
using System.Runtime.InteropServices;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Shared.Services {
	[Guid("278C1E14-E429-4364-8B73-BB643C041274")]
	public interface IEditorService {
		EditorState GetActiveEditorState();
		EditorState GetEditorState(IWpfTextView wpfTextView);
		EditorContext GetEditorContext();
		ActiveTextEditorSelection GetActiveTextEditorSelection();
		ActiveTextEditor GetActiveTextEditor();
		ActiveTextEditor GetActiveTextEditorFromUri(Uri uri);
		ActiveTextEditor CreateActiveTextEditor(IVirtualTextDocument textDocument, IWpfTextView wpfTextView);
	}
}
