using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Editor;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.TextManager.Interop;
using Serilog;
using System;
using System.ComponentModel.Composition;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Managers;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services {

	[Export(typeof(IEditorService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class EditorService : IEditorService {
		private static readonly ILogger Log = LogManager.ForContext<EditorService>();

		private readonly IServiceProvider _serviceProvider;
		private readonly IComponentModel _componentModel;

		[ImportingConstructor]
		public EditorService(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			try {
				_serviceProvider = serviceProvider;
				_componentModel = serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
				Assumes.Present(_componentModel);
			}
			catch (Exception ex) {
				Log.Fatal(ex, nameof(EditorService));
			}
		}

		public ActiveTextEditor CreateActiveTextEditor(IVirtualTextDocument textDocument, IWpfTextView wpfTextView) {
			try {
				if (textDocument == null || wpfTextView == null) return null;			 

				return new ActiveTextEditor(wpfTextView,
					textDocument.FileName,
					textDocument.Uri,
					wpfTextView.TextSnapshot.LineCount);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetActiveTextEditor));
			}
			return null;
		}

		private ActiveTextEditor CreateActiveTextEditor(IWpfTextView wpfTextView) {
			try {
				if (wpfTextView == null) {
					Log.Verbose($"{nameof(wpfTextView)} is null");
					return null;
				}
				if (!wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument)) return null;

				var activeTextEditor = CreateActiveTextEditor(virtualTextDocument, wpfTextView);
				if (activeTextEditor == null) return null;
			 
				return new ActiveTextEditor(wpfTextView,
					virtualTextDocument.FileName,
					virtualTextDocument.Uri,
					wpfTextView.TextSnapshot.LineCount);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CreateActiveTextEditor));
			}
			return null;
		}

		/// <summary>
		/// Gets the active wpfTextView (if any)
		/// </summary>
		/// <returns></returns>
		public ActiveTextEditor GetActiveTextEditor() {
			try {
				return CreateActiveTextEditor(GetActiveWpfTextView());
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetActiveTextEditor));
			}
			return null;
		}

		/// <summary>
		/// Gets the active wpfTextView based on the provided uri
		/// </summary>
		/// <param name="uri"></param>
		/// <returns>the ActiveTextEditor if that uri is part of an open document</returns>
		public ActiveTextEditor GetActiveTextEditorFromUri(Uri uri) {
			try {
				var textViewCache = _componentModel.GetService<IWpfTextViewCache>();
				if (textViewCache.TryGetValue(VirtualTextDocument.FromUri(uri), out IWpfTextView wpfTextView) && wpfTextView != null) {
					return CreateActiveTextEditor(wpfTextView);
				}
			}
			catch (Exception ex) {
				Log.Error(ex, $"{nameof(GetActiveTextEditorFromUri)} {uri}");
			}
			return null;
		}

		/// <summary>
		/// Gets the active wpfTextView from IVsEditorAdaptersFactoryService
		/// </summary>
		/// <returns></returns>
		private IWpfTextView GetActiveWpfTextView() {
			try {
				var textView = GetActiveView();
				return textView == null
					? null
					: _componentModel.GetService<IVsEditorAdaptersFactoryService>()?.GetWpfTextView(textView);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetActiveWpfTextView));
			}
			return null;
		}

		private IWpfTextView GetActiveWpfTextView(IVsTextView textView) {
			try {
				if (textView == null) return null;

				var editor = _componentModel.GetService<IVsEditorAdaptersFactoryService>();
				return editor.GetWpfTextView(textView);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetActiveWpfTextView));
			}
			return null;
		}

		[Obsolete("Old api requires the UI thread")]
		public EditorState GetActiveEditorState() {
			try {
				return GetActiveEditorState(out IVsTextView textView);
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(GetActiveEditorState));
			}
			return null;
		}

		[Obsolete("Old api requires the UI thread")]
		private EditorState GetActiveEditorState(out IVsTextView view) {
			try {
				// ReSharper disable once UnusedVariable
				view = GetActiveView();
				return GetActiveEditorState(view);
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(GetActiveEditorState));
			}
			view = null;
			return null;
		}

		[Obsolete("Old api requires the UI thread")]
		public EditorState GetActiveEditorState(IVsTextView view) {
			try {
				// view can be null...
				if (view == null) return null;

				view.GetCaretPos(out int piLine, out int piColumn);
				view.GetSelection(out int startLine, out int startColumn, out int endLine, out int endColumn);
				view.GetSelectedText(out string selectedText);

				// end could be before beginning...
				return new EditorState(
					new Range {
						Start = new Position(startLine, startColumn),
						End = new Position(endLine, endColumn)
					}, new Position(piLine, piColumn), selectedText);
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(GetActiveEditorState));
			}
			view = null;
			return null;
		}

		public EditorState GetEditorState(IWpfTextView wpfTextView) {
			try {
				return wpfTextView.GetEditorState();
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetEditorState));
				return new EditorState(new Range().AsEmpty(), new Position(0, 0), null);
			}
		}

		public static string GetText(SnapshotSpan snapshotSpan) {
			return snapshotSpan.Snapshot.GetText(snapshotSpan);
		}

		private Range GetActiveEditorSelectedRange(out IVsTextView view) {
			try {
				// ReSharper disable once UnusedVariable
				view = GetActiveView();
				if (view == null) {
					return null;
				}

				view.GetSelection(out int startLine, out int startColumn, out int endLine, out int endColumn);
				return new Range {
					Start = new Position(startLine, startColumn),
					End = new Position(endLine, endColumn)
				};
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(GetActiveEditorSelectedRange));
			}
			view = null;
			return null;
		}

		private ActiveTextEditor ToActiveTextEditor(IWpfTextView wpfTextView, IVirtualTextDocument virtualTextDocument) {
			return new ActiveTextEditor(wpfTextView,
				virtualTextDocument.FileName,
				virtualTextDocument.Uri,
				wpfTextView.TextSnapshot.LineCount);
		}

		private ActiveTextEditor GetActiveTextEditor(IVsTextView textView) {
			try {
				var wpfTextView = GetActiveWpfTextView(textView);
				if (wpfTextView == null) return null;
				if (!TextDocumentExtensions.TryGetTextDocument(_componentModel.GetService<ITextDocumentFactoryService>(), wpfTextView, out var textDocument)) return null;

				return ToActiveTextEditor(wpfTextView, textDocument);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(GetActiveTextEditor));
			}
			return null;
		}

		private IVsTextView GetActiveView() {
			var textManager = _serviceProvider.GetService(typeof(SVsTextManager)) as IVsTextManager;
			if (textManager == null) return null;

			textManager.GetActiveView(1, null, out IVsTextView textView);
			return textView;
		}

		public EditorContext GetEditorContext() {
			var editorState = GetActiveEditorState(out IVsTextView textView);
			var activeTextEditor = GetActiveTextEditor(textView);

			EditorContext editorContext = null;
			if (activeTextEditor != null) {
				try {
					editorContext = new EditorContext {
						ActiveFile = activeTextEditor.FileName,
						TextEditorVisibleRanges = activeTextEditor.WpfTextView?.ToVisibleRangesSafe(),
						TextEditorUri = activeTextEditor.Uri?.ToString(),
						TextEditorSelections = editorState.ToEditorSelectionsSafe(),
						TextEditorLineCount = activeTextEditor.TotalLines,
						Metrics = ThemeManager.CreateEditorMetrics(activeTextEditor.WpfTextView),
					};
				}
				catch (Exception ex) {
					Log.Warning(ex, nameof(editorContext));
					editorContext = new EditorContext {
						Metrics = ThemeManager.CreateEditorMetrics()
					};
				}
			}
			else {
				editorContext = new EditorContext {
					Metrics = ThemeManager.CreateEditorMetrics()
				};
			}
			return editorContext;
		}

		public ActiveTextEditorSelection GetActiveTextEditorSelection() {
			try {
				var range = GetActiveEditorSelectedRange(out IVsTextView view);
				if (view == null) return null;

				var wpfTextView = _componentModel.GetService<IVsEditorAdaptersFactoryService>()?.GetWpfTextView(view);
				if (wpfTextView == null) return null;

				if (!TextDocumentExtensions.TryGetTextDocument(_componentModel.GetService<ITextDocumentFactoryService>(),
					wpfTextView, out var textDocument)) return null;

				return new ActiveTextEditorSelection(textDocument.Uri, range);
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(ActiveTextEditorSelection));
			}
			return null;
		}
	}
}
