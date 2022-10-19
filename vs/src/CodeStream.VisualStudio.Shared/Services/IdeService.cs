using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Logging.Instrumentation;
using CodeStream.VisualStudio.Core.Models;
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
using System.Windows.Forms;
using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;

using Microsoft.Build.Framework.XamlTypes;

using File = System.IO.File;
using IComponentModel = Microsoft.VisualStudio.ComponentModelHost.IComponentModel;
using ILogger = Serilog.ILogger;

namespace CodeStream.VisualStudio.Shared.Services {
	[Export(typeof(IIdeService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class IdeService : IIdeService {
		private static readonly ILogger Log = LogManager.ForContext<IdeService>();

		private readonly IServiceProvider _serviceProvider;
		private readonly IComponentModel _componentModel;
		
		[ImportingConstructor]
		public IdeService([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			try {
				_serviceProvider = serviceProvider;
				_componentModel = serviceProvider?.GetService(typeof(SComponentModel)) as IComponentModel;
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
				if (scrollTo == null)
				{
					return null;
				}

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
		public void ScrollEditor(Uri fileUri, int? scrollTo = null, int? deltaPixels = null, bool? atTop = false) {
			if (scrollTo == null || scrollTo.Value < 0)
			{
				return;
			}

			using (var metrics = Log.WithMetrics($"{nameof(ScrollEditor)} {fileUri} scrollTo={scrollTo} atTop={atTop}")) {
				try {
					var textViewCache = _componentModel.GetService<IWpfTextViewCache>();
					if (!textViewCache.TryGetValue(VirtualTextDocument.FromUri(fileUri), out var wpfTextView) || wpfTextView == null)
					{
						return;
					}

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

		public FolderBrowserDialog FolderPrompt(string message, string initialDirectory = null, bool multiSelect = false) {
			ThreadHelper.ThrowIfNotOnUIThread();		 
		 
			return new FolderBrowserDialog();
		}

		private async System.Threading.Tasks.Task<IWpfTextView> AssertWpfTextViewAsync(Uri fileUri, bool forceOpen = false) {
			var textViewCache = _componentModel.GetService<IWpfTextViewCache>();
			var virtualDoc = VirtualTextDocument.FromUri(fileUri);
			if (forceOpen || !textViewCache.TryGetValue(virtualDoc, out var wpfTextView)) {
				var view = _componentModel.GetService<IEditorService>().GetActiveTextEditor();
				if (view == null || (!view.Uri.EqualsIgnoreCase(fileUri) && !view.Uri.IsTempFile())) {
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
					var localPath = fileUri.ToLocalPath();
					var window = TryOpenFile(localPath);
					if (window == null)
					{
						return null;
					}

					// the TextView/WpfTextView may not be immediately available -- try to get it.
					wpfTextView = TryGetPendingWpfTextView(localPath);
				}
				else {
					wpfTextView = view.WpfTextView;
				}
			}

			return wpfTextView;
		}

		private Window TryOpenFile(string localPath, string viewKind = EnvDTE.Constants.vsViewKindCode) {
			try {
				ThreadHelper.ThrowIfNotOnUIThread();

				if (!(_serviceProvider.GetService(typeof(DTE)) is DTE dte)) {
					Log.Error($"{nameof(dte)} is null for {localPath}");
					return null;
				}
				var window = dte.ItemOperations.OpenFile(localPath, viewKind);
				return window;
			}
			catch (ArgumentException ex) {
				if (ex.Message?.Contains("The parameter is incorrect") == true) {
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
			if (range == null)
			{
				return null;
			}

			var lines = GetStartAndEndLines(wpfTextView, range.Start.Line, range.End.Line);
			if (lines == null)
			{
				return null;
			}

			var span = new SnapshotSpan(wpfTextView.TextSnapshot, Span.FromBounds(lines.Item1.Start, lines.Item2.End));
			if (wpfTextView.InLayout)
			{
				return null;
			}

			wpfTextView.ViewScroller.EnsureSpanVisible(span, EnsureSpanVisibleOptions.MinimumScroll);
			return span;
		}

		private static Tuple<ITextSnapshotLine, ITextSnapshotLine> GetStartAndEndLines(ITextView wpfTextView, int startLine, int endLine) {
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
		/// Moves the target scrollToLine to the top of the editor
		/// </summary>
		/// <param name="wpfTextView"></param>
		/// <param name="scrollToLine"></param>
		private static void ScrollViewportVerticallyByPixels(IWpfTextView wpfTextView, int scrollToLine) {
			var firstTextViewLine = wpfTextView.TextViewLines.FirstOrDefault();
			var startingVisibleLineNumber = wpfTextView.TextSnapshot.GetLineNumberFromPosition(firstTextViewLine.Extent.Start.Position);
			wpfTextView.ViewScroller.ScrollViewportVerticallyByPixels((startingVisibleLineNumber - scrollToLine + 1) * wpfTextView.LineHeight);
		}
		
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

			if (Retry.WithExponentialBackoff(() => VsShellUtilities.IsDocumentOpen(
				    _serviceProvider,
				    filePath,
				    Guid.Empty,
				    out uiHierarchy,
				    out itemID,
				    out windowFrame)
			    )) 
			{
				if (windowFrame == null)
				{
					return null;
				}

				var view = VsShellUtilities.GetTextView(windowFrame);
				Log.Verbose($"{nameof(TryGetPendingWpfTextView)} found for {filePath}");
				return editorAdapterFactoryService.GetWpfTextView(view);
			}

			return null;
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
			var thread = new System.Threading.Thread(() => System.Windows.Clipboard.SetText(text));
			thread.SetApartmentState(ApartmentState.STA); //Set the thread to STA
			thread.Start();
			thread.Join();

			return System.Threading.Tasks.Task.CompletedTask;
		}

		/// <summary>
		/// Compares the contents of two files. Requires UI thread.
		/// </summary>
		public void CompareTempFiles(string filePath, string content, ITextBuffer textBuffer, Span span, string markerContent, string title)
		{
			var tempFile1 = string.Empty;
			var tempFile2 = string.Empty;

			try
			{
				tempFile1 = CreateTempFileFromData(filePath, content, ComparisonSide.Left);
				tempFile2 = CreateTempFileFromData(filePath, content, ComparisonSide.Right);

				var grfDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_LeftFileIsTemporary |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;

				CompareFiles(tempFile1, tempFile2, textBuffer, span, markerContent, grfDiffOptions, title);
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(CompareTempFiles));
			}
			finally
			{
				RemoveTempFileSafe(tempFile1);
				RemoveTempFileSafe(tempFile2);
			}
		}

		public void CompareWithRightTempFile(string filePath, string content, ITextBuffer textBuffer, Span span, string markerContent, string title)
		{
			var tempFile2 = string.Empty;

			try
			{
				tempFile2 = CreateTempFileFromData(filePath, content, ComparisonSide.Right);

				var grfDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;

				CompareFiles(filePath, tempFile2, textBuffer, span, markerContent, grfDiffOptions, title);
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(CompareTempFiles));
			}
			finally
			{
				RemoveTempFileSafe(tempFile2);
			}
		}

		private void CompareFiles(string filePath1, string filePath2, ITextBuffer textBuffer, Span span, string markerContent, __VSDIFFSERVICEOPTIONS diffOptions, string title = null) {
			ThreadHelper.ThrowIfNotOnUIThread();

			try {
				var diffService = (IVsDifferenceService)_serviceProvider.GetService(typeof(SVsDifferenceService));
				Assumes.Present(diffService);

				var grfDefaultDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_DetectBinaryFiles;

				var frame = diffService.OpenComparisonWindow2(
					filePath1, 
					filePath2,
					title ?? "Your version vs Codemark version",
					filePath1 + Environment.NewLine + filePath2,
					filePath1,
					filePath2, 
					null, 
					null, 
					(uint)(grfDefaultDiffOptions | diffOptions)
				);

				var diffViewer = GetDiffViewer(frame);
				diffViewer.Properties.AddProperty(PropertyNames.IsFRDiff, true);
				diffViewer.ViewMode = DifferenceViewMode.SideBySide;

				var text = textBuffer.CurrentSnapshot.GetText();

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
					if (edit.Replace(span, markerContent)) {
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
		}

		public enum ComparisonSide
		{
			Left,
			Right
		}
		
		private static string CreateTempFileFromData(string originalFilePath, string content, ComparisonSide direction)
		{
			if (content.IsNullOrWhiteSpace())
			{
				content = string.Empty;
			}

			var tempFileName = Path.GetFileNameWithoutExtension(Path.GetRandomFileName());
			var originalFileExtension = Path.GetExtension(originalFilePath);

			var codeStreamDiffPath = Path.Combine(Path.GetTempPath(), "codestream");
			Directory.CreateDirectory(codeStreamDiffPath);
			
			var tempFileForComparison = Path.Combine(codeStreamDiffPath, $"{tempFileName}-{direction.ToString().ToLower()}{originalFileExtension}");
			File.WriteAllText(tempFileForComparison, content.NormalizeLineEndings(), Encoding.UTF8);

			return tempFileForComparison;
		}

		public void PullRequestDiff(
			string originalFilePath, 
			string leftContent, 
			PullRequestDiffUri leftData, 
			string rightContent, 
			PullRequestDiffUri rightData, 
			string title)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			var leftFile = CreateTempFileFromData(originalFilePath, leftContent, ComparisonSide.Left);
			var rightFile = CreateTempFileFromData(originalFilePath, rightContent, ComparisonSide.Right);

			try
			{
				var diffService = (IVsDifferenceService)_serviceProvider.GetService(typeof(SVsDifferenceService));
				Assumes.Present(diffService);

				var grfDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_DetectBinaryFiles |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_LeftFileIsTemporary |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;

				IVsWindowFrame frame;

				using (new NewDocumentStateScope(__VSNEWDOCUMENTSTATE.NDS_Provisional, VSConstants.NewDocumentStateReason.SolutionExplorer))
				{
					frame = diffService.OpenComparisonWindow2(
						leftFile,
						rightFile,
						title ?? "Your version vs Other version",
						leftFile + Environment.NewLine + rightFile,
						$"{originalFilePath}@{leftData.LeftSha.Substring(0,8)}",
						$"{originalFilePath}@{rightData.RightSha.Substring(0,8)}",
						null,
						null,
						(uint)grfDiffOptions
					);
				}

				var diffViewer = GetDiffViewer(frame);
				diffViewer.Properties.AddProperty(PropertyNames.IsDiff, true);
				diffViewer.Properties.AddProperty(PropertyNames.IsPRDiff, true);
				diffViewer.Properties.AddProperty(PropertyNames.OverrideFileUri, rightData.Uri.ToString());
				diffViewer.ViewMode = DifferenceViewMode.SideBySide;

				frame.Show();
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(PullRequestDiff));
			}
			finally
			{
				RemoveTempFileSafe(leftFile);
				RemoveTempFileSafe(rightFile);
			}
		}

		public void FeedbackRequestDiff(
			string originalFilePath, 
			string leftContent, 
			FeedbackRequestDiffUri leftData,
			string rightContent, 
			FeedbackRequestDiffUri rightData,
			string title) {

			ThreadHelper.ThrowIfNotOnUIThread();

			var leftFile = CreateTempFileFromData(originalFilePath, leftContent, ComparisonSide.Left);
			var rightFile = CreateTempFileFromData(originalFilePath, rightContent, ComparisonSide.Right);

			try
			{
				var diffService = (IVsDifferenceService)_serviceProvider.GetService(typeof(SVsDifferenceService));
				Assumes.Present(diffService);

				var grfDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_DetectBinaryFiles |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_LeftFileIsTemporary |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;

				IVsWindowFrame frame;

				using (new NewDocumentStateScope(__VSNEWDOCUMENTSTATE.NDS_Provisional, VSConstants.NewDocumentStateReason.SolutionExplorer))
				{
					frame = diffService.OpenComparisonWindow2(
						leftFile,
						rightFile,
						title ?? "Your version vs Other version",
						leftFile + Environment.NewLine + rightFile,
						originalFilePath,
						originalFilePath,
						null,
						null,
						(uint)grfDiffOptions
					);
				}

				var diffViewer = GetDiffViewer(frame);
				diffViewer.ViewMode = DifferenceViewMode.SideBySide;

				diffViewer.Properties.AddProperty(PropertyNames.IsDiff, true);
				diffViewer.Properties.AddProperty(PropertyNames.IsFRDiff, true);
				diffViewer.Properties.AddProperty(PropertyNames.OverrideFileUri, rightData.Uri.ToString());

				frame.Show();
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(PullRequestDiff));
			}
			finally
			{
				RemoveTempFileSafe(leftFile);
				RemoveTempFileSafe(rightFile);
			}
		}

		public void DiffTextBlocks(
			string originalFilePath, 
			string leftContent, 
			string rightContent, 
			string title) {

			ThreadHelper.ThrowIfNotOnUIThread();

			var leftFile = CreateTempFileFromData(originalFilePath, leftContent, ComparisonSide.Left);
			var rightFile = CreateTempFileFromData(originalFilePath, rightContent, ComparisonSide.Right);

			try
			{
				var diffService = (IVsDifferenceService)_serviceProvider.GetService(typeof(SVsDifferenceService));
				Assumes.Present(diffService);

				var grfDiffOptions = __VSDIFFSERVICEOPTIONS.VSDIFFOPT_DetectBinaryFiles |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_LeftFileIsTemporary |
				                     __VSDIFFSERVICEOPTIONS.VSDIFFOPT_RightFileIsTemporary;

				IVsWindowFrame frame;

				using (new NewDocumentStateScope(__VSNEWDOCUMENTSTATE.NDS_Provisional, VSConstants.NewDocumentStateReason.SolutionExplorer))
				{
					frame = diffService.OpenComparisonWindow2(
						leftFile,
						rightFile,
						title ?? "Your version vs Other version",
						leftFile + Environment.NewLine + rightFile,
						originalFilePath,
						originalFilePath,
						null,
						null,
						(uint)grfDiffOptions
					);
				}

				var diffViewer = GetDiffViewer(frame);
				diffViewer.ViewMode = DifferenceViewMode.SideBySide;

				diffViewer.Properties.AddProperty(PropertyNames.IsDiff, true);
				diffViewer.Properties.AddProperty(PropertyNames.IsFRDiff, true);
				diffViewer.Properties.AddProperty(PropertyNames.OriginalFilePath, originalFilePath);
				diffViewer.Properties.AddProperty(PropertyNames.RightFilePath, Path.GetFileName(rightFile));


				frame.Show();
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(PullRequestDiff));
			}
			finally
			{
				RemoveTempFileSafe(leftFile);
				RemoveTempFileSafe(rightFile);
			}
		}
		/// <summary>
		/// Gets a reference to an open Diff Editor for a CodeStream Diff
		/// </summary>
		/// <remarks>
		/// Switches to Main thread to run
		/// </remarks>
		public IDifferenceViewer GetActiveDiffEditor()
		{
			return ThreadHelper.JoinableTaskFactory.Run(
				async delegate
				{
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

					try
					{
						foreach (var iVsWindowFrame in GetDocumentWindowFrames())
						{
							try
							{
								var diffViewer = GetDiffViewer(iVsWindowFrame);

								if (diffViewer?.Properties?.TryGetProperty(PropertyNames.IsDiff, out bool result) == true)
								{
									return diffViewer;
								}
							}
							catch (Exception ex)
							{
								Log.Warning(ex, nameof(GetActiveDiffEditor));
							}
						}
					}
					catch (Exception ex)
					{
						Log.Error(ex, nameof(GetActiveDiffEditor));
					}

					return null;
				}
			);
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
						if (diffViewer?.Properties?.TryGetProperty(PropertyNames.IsDiff, out bool result) == true) {
							iVsWindowFrame.CloseFrame((uint)__FRAMECLOSE.FRAMECLOSE_NoSave);
						}
					}
					catch (Exception ex) {
						Log.Warning(ex, nameof(TryCloseDiffs));
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(TryCloseDiffs));
			}
		}

		private static IEnumerable<IVsWindowFrame> GetDocumentWindowFrames() {
			ThreadHelper.ThrowIfNotOnUIThread();

			if (Package.GetGlobalService(typeof(SVsUIShell)) is IVsUIShell shell) {
				var hr = shell.GetDocumentWindowEnum(out var framesEnum);
				if (hr == VSConstants.S_OK && framesEnum != null) {
					var frames = new IVsWindowFrame[1];

					while (framesEnum.Next(1, frames, out var fetched) == VSConstants.S_OK && fetched == 1) {
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

		private static void RemoveTempFileSafe(string fileName) {
			try {
				System.IO.File.Delete(fileName);
				Log.Verbose($"Removed temp file {fileName}");
			}
			catch (Exception ex) {
				Log.Warning(ex, $"Failed to remove temp file {fileName}");
			}
		}
	}
}
