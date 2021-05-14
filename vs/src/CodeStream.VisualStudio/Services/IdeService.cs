using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Logging.Instrumentation;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.UI;
using EnvDTE;
using Microsoft;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Editor;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Differencing;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.TextManager.Interop;
using Microsoft.WindowsAPICodePack.Dialogs;
using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows;
using IComponentModel = Microsoft.VisualStudio.ComponentModelHost.IComponentModel;
using ILogger = Serilog.ILogger;

namespace CodeStream.VisualStudio.Services {
	[Export(typeof(IIdeService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class IdeService : IIdeService {
		private static readonly ILogger Log = LogManager.ForContext<IdeService>();

		private readonly IServiceProvider _serviceProvider;
		private readonly IComponentModel _componentModel;

		// private readonly Dictionary<ExtensionKind, bool> _extensions;

		[ImportingConstructor]
		public IdeService([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			try {
				_serviceProvider = serviceProvider;
				_componentModel = serviceProvider?.GetService(typeof(SComponentModel)) as IComponentModel;
				//_extensions = ExtensionManager.Initialize(LogManager.ForContext<ExtensionManagerDummy>()).Value;
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(IdeService));
			}
		}

		public IdeService() {
			//unit testing ctor
		}

		public async System.Threading.Tasks.Task<OpenEditorResult> OpenEditorAndRevealAsync(Uri fileUri, int? scrollTo = null, bool? atTop = false, bool? focus = false) {
			using (Log.CriticalOperation($"{nameof(OpenEditorAndRevealAsync)} {fileUri} scrollTo={scrollTo}")) {
				if (scrollTo == null) return null;

				var scrollToLine = scrollTo.Value;
				try {
					var wpfTextView = await AssertWpfTextViewAsync(fileUri);
					if (wpfTextView != null) {
						if (atTop == true) {
							ScrollViewportVerticallyByPixels(wpfTextView, scrollToLine);
						}
						else {
							EnsureTargetSpanVisible(wpfTextView, scrollToLine);
						}

						if (focus == true) {
							wpfTextView.VisualElement.Focus();
						}
					}
					return new OpenEditorResult() {
						Success = wpfTextView != null,
						VisualElement = wpfTextView?.VisualElement
					};
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(OpenEditorAndRevealAsync)} failed for {fileUri}");
					return null;
				}
			}
		}

		/// <summary>
		///
		/// </summary>
		/// <param name="fileUri"></param>
		/// <param name="range"></param>
		/// <param name="forceOpen"></param>
		/// <returns></returns>
		public async System.Threading.Tasks.Task<IWpfTextView> OpenEditorAtLineAsync(Uri fileUri, Range range, bool forceOpen = false) {
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
			using (Log.CriticalOperation($"{nameof(OpenEditorAtLineAsync)} {fileUri} range={range?.Start?.Line}, {range?.End?.Line}")) {
				try {
					var wpfTextView = await AssertWpfTextViewAsync(fileUri, forceOpen);
					if (wpfTextView != null) {
						var span = EnsureSnapshotSpanVisible(wpfTextView, range);
						if (span != null) {
							wpfTextView.Caret.MoveTo(new SnapshotPoint(wpfTextView.TextSnapshot, span.Value.Start + range.Start.Character));
							wpfTextView.Caret.EnsureVisible();
						}
						return wpfTextView;
					}
					return null;
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(OpenEditorAtLineAsync)} failed for {fileUri}");
					return null;
				}
			}
		}

		/// <summary>
		/// Scrolls an editor, only if it is already open
		/// </summary>
		/// <param name="fileUri"></param>
		/// <param name="scrollTo"></param>
		/// <param name="atTop"></param>
		public void ScrollEditor(Uri fileUri, int? scrollTo = null, int? deltaPixels = null, bool? atTop = false) {
			if (scrollTo == null || scrollTo.Value < 0) return;

			using (var metrics = Log.WithMetrics($"{nameof(ScrollEditor)} {fileUri} scrollTo={scrollTo} atTop={atTop}")) {
				try {
					var textViewCache = _componentModel.GetService<IWpfTextViewCache>();
					if (!textViewCache.TryGetValue(VirtualTextDocument.FromUri(fileUri), out var wpfTextView) || wpfTextView == null) return;

					if (deltaPixels != null) {
						wpfTextView.ViewScroller.ScrollViewportVerticallyByPixels(-deltaPixels.Value);
						return;
					}

					var scrollToLine = scrollTo.Value;

					if (atTop == true) {
						using (metrics.Measure("ScrollViewportVerticallyByPixels")) {
							ScrollViewportVerticallyByPixels(wpfTextView, scrollToLine);
						}
					}
					else {
						EnsureTargetSpanVisible(wpfTextView, scrollToLine);
					}
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(ScrollEditor)} failed for {fileUri}");
				}
			}
		}

		public CommonFileDialog FolderPrompt(string message, string initialDirectory = null, bool multiSelect = false) {
			ThreadHelper.ThrowIfNotOnUIThread();

			return new CommonOpenFileDialog() {
				InitialDirectory = initialDirectory ?? Environment.ExpandEnvironmentVariables("%HOMEDRIVE%%HOMEPATH%"),
				IsFolderPicker = true,
				Multiselect = multiSelect,
				Title = message ?? "Please select a folder"
			};
		}

		private async System.Threading.Tasks.Task<IWpfTextView> AssertWpfTextViewAsync(Uri fileUri, bool forceOpen = false) {
			var textViewCache = _componentModel.GetService<IWpfTextViewCache>();
			if (forceOpen == true || !textViewCache.TryGetValue(VirtualTextDocument.FromUri(fileUri), out var wpfTextView)) {
				var view = _componentModel.GetService<IEditorService>().GetActiveTextEditor();
				if (view == null || !view.Uri.EqualsIgnoreCase(fileUri)) {
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
					var localPath = fileUri.ToLocalPath();
					EnvDTE.Window window = TryOpenFile(localPath);
					if (window == null) return null;
					// the TextView/WpfTextView may not be immediately available -- try to get it.
					wpfTextView = TryGetPendingWpfTextView(localPath);
				}
				else {
					wpfTextView = view?.WpfTextView;
				}
			}

			return wpfTextView;
		}

		private EnvDTE.Window TryOpenFile(string localPath, string viewKind = EnvDTE.Constants.vsViewKindCode) {
			try {
				ThreadHelper.ThrowIfNotOnUIThread();

				var dte = _serviceProvider.GetService(typeof(DTE)) as DTE;
				if (dte == null) {
					Log.Error($"{nameof(dte)} is null for {localPath}");
					return null;
				}
				var window = dte.ItemOperations.OpenFile(localPath, viewKind);
				return window;
			}
			catch (ArgumentException ex) {
				if (ex?.Message?.Contains("The parameter is incorrect") == true) {
					Log.Warning(ex, $"{localPath} may not exist");
				}
				else {
					Log.Warning(ex, $"{localPath}");
				}
			}
			catch (Exception ex) {
				Log.Error(ex, $"{localPath}");
			}
			return null;
		}

		private void EnsureTargetSpanVisible(IWpfTextView wpfTextView, int scrollToLine) {
			var lines = wpfTextView.VisualSnapshot.Lines;
			var startLine = lines.FirstOrDefault(_ => _.LineNumber == scrollToLine);
			if (startLine == null) {
				Log.Warning($"{nameof(EnsureTargetSpanVisible)} failed for line={scrollToLine}");
				return;
			}
			var span = new SnapshotSpan(wpfTextView.TextSnapshot, Span.FromBounds(startLine.Start, Math.Min(startLine.Start + 1, wpfTextView.VisualSnapshot.Length)));
			wpfTextView.ViewScroller.EnsureSpanVisible(span, EnsureSpanVisibleOptions.MinimumScroll);
		}

		private SnapshotSpan? EnsureSnapshotSpanVisible(IWpfTextView wpfTextView, Range range) {
			if (range == null) return null;

			var lines = GetStartAndEndLines(wpfTextView, range.Start.Line, range.End.Line);
			if (lines == null) return null;

			var span = new SnapshotSpan(wpfTextView.TextSnapshot, Span.FromBounds(lines.Item1.Start, lines.Item2.End));
			if (wpfTextView.InLayout) return null;

			wpfTextView.ViewScroller.EnsureSpanVisible(span, EnsureSpanVisibleOptions.MinimumScroll);
			return span;
		}

		private Tuple<ITextSnapshotLine, ITextSnapshotLine> GetStartAndEndLines(IWpfTextView wpfTextView, int startLine, int endLine) {
			ITextSnapshotLine start = null;
			ITextSnapshotLine end = null;
			foreach (var line in wpfTextView.VisualSnapshot.Lines) {
				if (line.LineNumber == startLine) {
					start = line;
				}
				if (line.LineNumber == endLine) {
					end = line;
				}
			}
			if (start != null && end != null) {
				return Tuple.Create(start, end);
			}
			return null;
		}

		/// <summary>
		/// This can be abysmally slow. Moves the target scrollToLine to the top of the editor
		/// </summary>
		/// <param name="wpfTextView"></param>
		/// <param name="scrollToLine"></param>
		private void ScrollViewportVerticallyByLines(IWpfTextView wpfTextView, int scrollToLine) {
			var firstTextViewLine = wpfTextView.TextViewLines.FirstOrDefault();
			var startingVisibleLineNumber = wpfTextView.TextSnapshot.GetLineNumberFromPosition(firstTextViewLine.Extent.Start.Position);
			var lineCount = startingVisibleLineNumber - scrollToLine;
			wpfTextView.ViewScroller.ScrollViewportVerticallyByLines(lineCount < 0 ? ScrollDirection.Down : ScrollDirection.Up, Math.Abs(lineCount));
		}

		/// <summary>
		/// Moves the target scrollToLine to the top of the editor
		/// </summary>
		/// <param name="wpfTextView"></param>
		/// <param name="scrollToLine"></param>
		private void ScrollViewportVerticallyByPixels(IWpfTextView wpfTextView, int scrollToLine) {
			var firstTextViewLine = wpfTextView.TextViewLines.FirstOrDefault();
			int startingVisibleLineNumber = wpfTextView.TextSnapshot.GetLineNumberFromPosition(firstTextViewLine.Extent.Start.Position);
			wpfTextView.ViewScroller.ScrollViewportVerticallyByPixels((startingVisibleLineNumber - scrollToLine + 1) * wpfTextView.LineHeight);
		}

		//public EditorState GetActiveEditorState() {
		//	return GetActiveEditorState(out IVsTextView textView);
		//}

		// someday, this can return...
		//public bool QueryExtensions(string author, params string[] names)
		//{
		//    if (_extensionManager == null)
		//    {
		//        Log.Debug($"{nameof(_extensionManager)} is null");
		//        return false;
		//    }

		//    foreach (var extension in _extensionManager.GetInstalledExtensions())
		//    {
		//        IExtensionHeader header = extension.Header;
		//        if (!header.SystemComponent &&
		//            header.Author.EqualsIgnoreCase(author) && names.Any(_ => _.EqualsIgnoreCase(header.Name)))
		//        {
		//            return true;
		//        }
		//    }
		//    return false;
		//}

		/// <summary>
		/// Tries to get an active text view for a file that may have just opened.
		/// Uses a naive exponential backoff algorithm against the IsDocumentOpen VSShell utility
		/// </summary>
		/// <param name="filePath"></param>
		/// <returns></returns>
		/// <remarks>https://stackoverflow.com/a/7373385/208022</remarks>
		internal IWpfTextView TryGetPendingWpfTextView(string filePath) {
			var editorAdapterFactoryService = _componentModel.GetService<IVsEditorAdaptersFactoryService>();
			IVsUIHierarchy uiHierarchy;
			uint itemID;
			IVsWindowFrame windowFrame = null;

			if (Retry.WithExponentialBackoff(() => {
				if (VsShellUtilities.IsDocumentOpen(
				  _serviceProvider,
				  filePath,
				  Guid.Empty,
				  out uiHierarchy,
				  out itemID,
				  out windowFrame)) {
					return true;
				}
				return false;

			})) {
				if (windowFrame == null) return null;

				IVsTextView view = VsShellUtilities.GetTextView(windowFrame);
				Log.Verbose($"{nameof(TryGetPendingWpfTextView)} found for {filePath}");
				return editorAdapterFactoryService.GetWpfTextView(view);
			}

			return null;
		}

		public bool QueryExtension(ExtensionKind extensionKind) {
			return false;
			//if (_extensions == null) return false;

			//return _extensions.TryGetValue(extensionKind, out bool value) && value;
		}

		public bool TryStartLiveShare() {
			ThreadHelper.ThrowIfNotOnUIThread();

			try {
				ExecuteCommand("LiveShare.ShareWorkspace");
				return true;
			}
			catch (Exception ex) {
				Log.Error(ex, "Could not start Live Share");
			}

			return false;
		}

		public bool TryJoinLiveShare(string url) {
			ThreadHelper.ThrowIfNotOnUIThread();

			if (url.IsNullOrWhiteSpace()) {
				Log.Warning("Live Share Url is missing");
				return false;
			}

			try {
				ExecuteCommand("LiveShare.JoinWorkspace", $"/Root {url}");
				return true;
			}
			catch (Exception ex) {
				Log.Error(ex, "Could not join Live Share Url={Url}", url);
			}

			return false;
		}


		/// <summary>
		/// Uses built in process handler for navigating to an external url
		/// </summary>
		/// <param name="url">an absolute url</param>
		public void Navigate(string url) {
			if (url.IsNullOrWhiteSpace()) {
				Log.Warning("Url is missing");
				return;
			}

			System.Diagnostics.Process.Start(url);
		}

		public System.Threading.Tasks.Task SetClipboardAsync(string text) {
			var thread = new System.Threading.Thread(() => Clipboard.SetText(text));
			thread.SetApartmentState(ApartmentState.STA); //Set the thread to STA
			thread.Start();
			thread.Join();

			return System.Threading.Tasks.Task.CompletedTask;
		}

		////must be "" rather than null...
		private void ExecuteCommand(string commandName, string commandArgs = "") {
			ThreadHelper.ThrowIfNotOnUIThread();
			Log.Verbose("ExecuteCommand={CommandName} CommandArgs={commandArgs}", commandName, commandArgs);
			var dte = _serviceProvider.GetService(typeof(DTE)) as DTE;
			if (dte == null) throw new ArgumentNullException(nameof(dte));
			dte.ExecuteCommand(commandName, commandArgs);
			Log.Debug("ExecuteCommand={CommandName} CommandArgs={commandArgs} Success", commandName, commandArgs);
		}

		private static readonly Encoding VsDefaultEncoding = new UTF8Encoding(true);

		private string CreateTempFile(string fileName) {
			try {
				var name = Path.GetFileName(fileName);
				if (name == null) return null;
				var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
				Directory.CreateDirectory(path); // Ensure temp path exists.
				var tempFile = Path.Combine(path, name);
				Log.Verbose($"Created temp file {tempFile}");
				return tempFile;
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CreateTempFile));
			}

			return null;
		}

		public string CreateTempFile(string originalFilePath, string content) {
			try {
				var tempFile = CreateTempFile(originalFilePath);
				if (tempFile == null) return null;

				using (var fs = System.IO.File.OpenRead(originalFilePath))
				using (var reader = new StreamReader(fs, Encoding.UTF8, true)) {
					reader.Peek();
					// do some magic to get the encoding from the current file
					var encoding = reader.CurrentEncoding;
					using (var writer = new StreamWriter(tempFile, false, encoding)) {
						writer.Write(content);
					}
				}

				return tempFile;
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CreateTempFile));
			}

			return null;
		}

		/// <summary>
		/// Compares the contents of two files. Requires UI thread.
		/// </summary>
		/// <param name="filePath1"></param>
		/// <param name="filePath2"></param>
		/// <param name="content"></param>
		/// <param name="isFile1Temp"></param>
		/// <param name="isFile2Temp"></param>
		/// <param name="textBuffer"></param>
		/// <param name="span"></param>		
		public void CompareFiles(string filePath1, string filePath2, ITextBuffer textBuffer, Span span, string content, bool isFile1Temp = false, bool isFile2Temp = false) {
			ThreadHelper.ThrowIfNotOnUIThread();
			if (filePath1.IsNullOrWhiteSpace() || filePath2.IsNullOrWhiteSpace()) {
				if (filePath1.IsNullOrWhiteSpace()) {
					Log.Debug($"Missing {nameof(filePath1)}");
					return;
				}

				if (filePath2.IsNullOrWhiteSpace()) {
					Log.Debug($"Missing {nameof(filePath2)}");
					return;
				}
			}

			try {
				var diffService = (IVsDifferenceService)_serviceProvider.GetService(typeof(SVsDifferenceService));
				Assumes.Present(diffService);

				uint grfDiffOptions = 0;
				//don't use these options -- as it might seen like they should be useful, they actually break the diff
				//grfDiffOptions |= (uint)__VSDIFFSERVICEOPTIONS.VSDIFFOPT_LeftFileIsTemporary;
				//grfDiffOptions |= (uint)__VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;
				//grfDiffOptions |= (uint)__VSDIFFSERVICEOPTIONS.VSDIFFOPT_DoNotShow;
				string roles = null;//"DIFF,RIGHTDIFF,LEFTDIFF";
				var frame = diffService.OpenComparisonWindow2(filePath1, filePath2,
					$"Your version vs Codemark version",
					filePath1 + Environment.NewLine + filePath2,
					filePath1,
					filePath2, null, roles, grfDiffOptions);
				var diffViewer = GetDiffViewer(frame);
				var text = textBuffer.CurrentSnapshot.GetText();

				// why doesn't this work??? UGH
				//using (var edit = diffViewer.LeftView.TextBuffer.CreateEdit()) {
				//	if (edit.Delete(0, diffViewer.LeftView.TextBuffer.CurrentSnapshot.Length)) {
				//		if (edit.Insert(0, text)) {
				//			edit.Apply();
				//		}
				//	}
				//}

				using (var edit = diffViewer.RightView.TextBuffer.CreateEdit()) {
					//replace everything with the original buffer (it might have edits)
					if (edit.Delete(0, diffViewer.RightView.TextBuffer.CurrentSnapshot.Length)) {
						if (edit.Insert(0, text)) {
							edit.Apply();
						}
					}
				}

				using (var edit = diffViewer.RightView.TextBuffer.CreateEdit()) {
					// replace the span with the marker's code
					if (edit.Replace(span, content)) {
						edit.Apply();
					}
				}
				var documentRight = diffViewer.RightView.TextBuffer.GetDocument();
				if (documentRight.IsDirty) {
					documentRight.Save();
				}

				frame.Show();
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CompareFiles));
			}
			finally {
				if (isFile1Temp) {
					RemoveTempFileSafe(filePath1);
				}
				if (isFile2Temp) {
					RemoveTempFileSafe(filePath2);
				}
			}
		}

		private string CreateTempFileFromData(string filePath, string content, string direction, IPathData data = null) {
			List<string> parts = data?.PathParts.AnySafe() == true ? data.PathParts : new List<string>();
			var pathParts = parts.Concat(new List<string>() {
				direction,
				"codestream-diff"
			});

			var path = Path.Combine(Path.GetTempPath(),
					"codestream",
					"vs",
					"codestream-diff");
			path = Path.Combine((new string[] { path }).Concat(pathParts).ToArray());
			path = Path.Combine(path, Path.GetDirectoryName(filePath));

			Directory.CreateDirectory(path);
			path = Path.Combine(path, Path.GetFileName(filePath));

			System.IO.File.WriteAllText(path, content.NormalizeLineEndings(), Encoding.UTF8);
			return path;
		}

		public void DiffTextBlocks(string filePath, string leftContent, string rightContent, string title = null, IPathData data = null) {
			ThreadHelper.ThrowIfNotOnUIThread();
			if (leftContent.IsNullOrWhiteSpace()) {
				leftContent = string.Empty;
			}

			if (rightContent.IsNullOrWhiteSpace()) {
				rightContent = string.Empty;
			}

			var filePath1 = CreateTempFileFromData(filePath, leftContent, "left", data);
			var filePath2 = CreateTempFileFromData(filePath, rightContent, "right", data);
			try {
				var diffService = (IVsDifferenceService)_serviceProvider.GetService(typeof(SVsDifferenceService));
				Assumes.Present(diffService);
				string roles = null;
				var grfDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_DetectBinaryFiles |
				  __VSDIFFSERVICEOPTIONS.VSDIFFOPT_LeftFileIsTemporary |
				  __VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;

				IVsWindowFrame frame;
				using (new NewDocumentStateScope(__VSNEWDOCUMENTSTATE.NDS_Provisional, VSConstants.NewDocumentStateReason.SolutionExplorer)) {
					frame = diffService.OpenComparisonWindow2(
					filePath1,
					filePath2,
					title ?? $"Your version vs Other version",
					filePath1 + Environment.NewLine + filePath2,
					filePath1,
					filePath2, null, roles, (uint)grfDiffOptions);
				}

				var diffViewer = GetDiffViewer(frame);
				diffViewer.Properties.AddProperty(PropertyNames.IsReviewDiff, true);
				diffViewer.ViewMode = DifferenceViewMode.SideBySide;

				//var leftText = diffViewer.LeftView.TextBuffer.CurrentSnapshot.GetText();
				//var rightText = diffViewer.RightView.TextBuffer.CurrentSnapshot.GetText();

				//if (leftText.Length == 0) {
				//	diffViewer.ViewMode = DifferenceViewMode.RightViewOnly;
				//}
				//else if (rightText.Length == 0) {
				//	diffViewer.ViewMode = DifferenceViewMode.LeftViewOnly;
				//}
				//else if (leftText == rightText) {
				//	diffViewer.ViewMode = DifferenceViewMode.RightViewOnly;
				//}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(DiffTextBlocks));
			}
			finally {
				RemoveTempFileSafe(filePath1);
				RemoveTempFileSafe(filePath2);
			}
		}

		/// <summary>
		/// Tries to close any CodeStream-created diff windows
		/// </summary>
		public void TryCloseDiffs() {
			ThreadHelper.ThrowIfNotOnUIThread();
			try {
				foreach (var iVsWindowFrame in GetDocumentWindowFrames()) {
					try {
						var diffViewer = GetDiffViewer(iVsWindowFrame);
						if (diffViewer?.Properties?.TryGetProperty(PropertyNames.IsReviewDiff, out bool result) == true) {
							iVsWindowFrame.CloseFrame((uint)__FRAMECLOSE.FRAMECLOSE_NoSave);
						}
					}
					catch (Exception ex) {
						Log.Warning(ex, "Close DiffViewer");
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(TryCloseDiffs));
			}
		}

		private static bool GetTextViewFromFrame(IVsWindowFrame frame, out IVsTextView textView) {
			textView = VsShellUtilities.GetTextView(frame);
			return textView != null;
		}

		private static IEnumerable<IVsWindowFrame> GetDocumentWindowFrames() {
			ThreadHelper.ThrowIfNotOnUIThread();

			if (Package.GetGlobalService(typeof(SVsUIShell)) is IVsUIShell shell) {
				int hr = shell.GetDocumentWindowEnum(out IEnumWindowFrames framesEnum);
				if (hr == VSConstants.S_OK && framesEnum != null) {
					IVsWindowFrame[] frames = new IVsWindowFrame[1];

					while (framesEnum.Next(1, frames, out uint fetched) == VSConstants.S_OK && fetched == 1) {
						yield return frames[0];
					}
				}
			}
		}

		/// <summary>
		/// Gets the currently active text view(s) from Visual Studio.
		/// </summary>
		/// <returns>
		/// Zero, one or two active <see cref="ITextView"/> objects.
		/// </returns>
		/// <remarks>
		/// This method will return a single text view for a normal code window, or a pair of text
		/// views if the currently active text view is a difference view in side by side mode, with
		/// the first item being the side that currently has focus. If there is no active text view,
		/// an empty collection will be returned.
		/// </remarks>
		public CurrentTextViews GetCurrentTextViews() {
			ThreadHelper.ThrowIfNotOnUIThread();
			CurrentTextViews results = null;

			try {
				var monitorSelection = (IVsMonitorSelection)_serviceProvider.GetService(typeof(SVsShellMonitorSelection));
				if (monitorSelection == null) {
					return results;
				}

				object curDocument;
				if (ErrorHandler.Failed(monitorSelection.GetCurrentElementValue((uint)VSConstants.VSSELELEMID.SEID_DocumentFrame, out curDocument))) {
					return results;
				}

				IVsWindowFrame frame = curDocument as IVsWindowFrame;
				if (frame == null) {
					return results;
				}

				object docView = null;
				if (ErrorHandler.Failed(frame.GetProperty((int)__VSFPROPID.VSFPROPID_DocView, out docView))) {
					return results;
				}

				results = new CurrentTextViews {
					DocumentView = docView
				};
				var textViews = new List<ITextView>();
				if (docView is IVsDifferenceCodeWindow) {
					var diffWindow = (IVsDifferenceCodeWindow)docView;

					switch (diffWindow.DifferenceViewer.ViewMode) {
						case DifferenceViewMode.Inline:
							textViews.Add(diffWindow.DifferenceViewer.InlineView);
							break;
						case DifferenceViewMode.SideBySide:
							switch (diffWindow.DifferenceViewer.ActiveViewType) {
								case DifferenceViewType.LeftView:
									textViews.Add(diffWindow.DifferenceViewer.LeftView);
									textViews.Add(diffWindow.DifferenceViewer.RightView);
									break;
								case DifferenceViewType.RightView:
									textViews.Add(diffWindow.DifferenceViewer.RightView);
									textViews.Add(diffWindow.DifferenceViewer.LeftView);
									break;
							}
							textViews.Add(diffWindow.DifferenceViewer.LeftView);
							break;
						case DifferenceViewMode.RightViewOnly:
							textViews.Add(diffWindow.DifferenceViewer.RightView);
							break;
					}
				}
				else if (docView is IVsCodeWindow) {
					if (ErrorHandler.Failed(((IVsCodeWindow)docView).GetPrimaryView(out var textView))) {
						return results;
					}

					var model = (IComponentModel)_serviceProvider.GetService(typeof(SComponentModel));
					Assumes.Present(model);

					var adapterFactory = model.GetService<IVsEditorAdaptersFactoryService>();
					var wpfTextView = adapterFactory.GetWpfTextView(textView);
					textViews.Add(wpfTextView);
				}

				results.TextViews = textViews;
				return results;
			}
			catch (Exception e) {
				Log.Error(e, nameof(GetCurrentTextViews));
			}

			return results;
		}

		public static IDifferenceViewer GetDiffViewer(IVsWindowFrame frame) {
			ThreadHelper.ThrowIfNotOnUIThread();
			return ErrorHandler.Succeeded(frame.GetProperty((int)__VSFPROPID.VSFPROPID_DocView, out object docView))
				? (docView as IVsDifferenceCodeWindow)?.DifferenceViewer : null;
		}

		public void RemoveTempFileSafe(string fileName) {
			try {
				Directory.Delete(Path.GetDirectoryName(fileName), true);
				Log.Verbose($"Removed temp file {fileName}");
			}
			catch (Exception ex) {
				Log.Warning(ex, $"Failed to remove temp file {fileName}");
			}
		}
	}
	class Data : IPathData {
		public string Scheme { get; set; }
		public List<string> PathParts { get; set; }
	}
}
