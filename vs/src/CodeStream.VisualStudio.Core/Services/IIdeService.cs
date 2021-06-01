using System;
using System.Collections.Generic;
using System.Windows.Forms;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Core.Services {
	public interface IIdeService {
		/// <summary>
		/// Uses built in process handler for navigating to an external url
		/// </summary>
		/// <param name="url">an absolute url</param>
		void Navigate(string url);
		System.Threading.Tasks.Task SetClipboardAsync(string text);		
		void ScrollEditor(Uri fileUri, int? scrollTo = null, int? deltaPixels = null, bool? atTop = false);
		System.Threading.Tasks.Task<OpenEditorResult> OpenEditorAndRevealAsync(Uri fileUri, int? scrollTo = null, bool? atTop = false, bool? focus = false);
		System.Threading.Tasks.Task<IWpfTextView> OpenEditorAtLineAsync(Uri fileUri, Range range, bool forceOpen = false);
		//bool QueryExtensions(string author, params string[] names);
		bool QueryExtension(ExtensionKind extensionKind);
		bool TryStartLiveShare();
		bool TryJoinLiveShare(string url);		

		void CompareFiles(string filePath1, string filePath2, ITextBuffer file2Replacement, Microsoft.VisualStudio.Text.Span location, string content, bool isFile1Temp = false, bool isFile2Temp = false);
		void DiffTextBlocks(string filePath, string left, string right, string title = null, IPathData data = null);
		string CreateTempFile(string originalFilePath, string content);
		//	string CreateDiffTempFile(string originalFile, string content, Range range);
		void RemoveTempFileSafe(string fileName);
		CurrentTextViews GetCurrentTextViews();
		FolderBrowserDialog FolderPrompt(string message, string initialDirectory = null, bool multiSelect = false);		
		void TryCloseDiffs();
	}

	public interface IPathData {
		string Scheme { get; set; }
		List<string> PathParts { get; set; }
	}
}
