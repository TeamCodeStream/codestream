using System;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Adornments;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Extensions;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Models {

	public class ActiveTextEditorSelection {
		public ActiveTextEditorSelection(Uri uri, Range range) {
			Uri = uri;
			Range = range;
		}
		public Uri Uri { get; }
		public Range Range { get; }
	}

	public class ActiveTextEditor : ICanHighlightRange, ICanSelectRange {
		private static readonly ILogger Log = LogManager.ForContext<ActiveTextEditor>();

		public ActiveTextEditor(IWpfTextView wpfTextView, string fileName, Uri uri, int? totalLines) {
			WpfTextView = wpfTextView;
			FileName = fileName;
			Uri = uri;
			TotalLines = totalLines;
		}

		public IWpfTextView WpfTextView { get; }
		public string FileName { get; }
		public Uri Uri { get; }
		public int? TotalLines { get; }

		/// <summary>
		/// Highlights code using an adornment layer. Requires the UI thread.
		/// </summary>
		/// <param name="range"></param>
		/// <param name="highlight"></param>
		/// <returns></returns>
		public bool Highlight(Range range, bool highlight) {
			try {
				ThreadHelper.ThrowIfNotOnUIThread();
				var adornmentManager = this.GetHighlightAdornmentManager();
				if (adornmentManager == null) {
					Log.LocalWarning($"{nameof(adornmentManager)}:{nameof(Highlight)} not found for FileName={FileName} Uri={Uri}");
					return false;
				}

				return adornmentManager.Highlight(range, highlight);
			}
			catch (Exception ex) {
				Log.LocalWarning(ex.ToString());
				return false;
			}
		}

		/// <summary>
		/// Removes all highlight adornments
		/// </summary>
		public void RemoveAllHighlights() {
			var adornmentManager = this.GetHighlightAdornmentManager();
			if (adornmentManager == null) {
				Log.LocalWarning($"{nameof(adornmentManager)}:{nameof(RemoveAllHighlights)} not found for FileName={FileName} Uri={Uri}");
				return;
			}

			adornmentManager.RemoveAllHighlights();
		}

		/// <summary>
		/// Will use the Wpf apis to select a range of code (can handle single points as well)
		/// </summary>
		/// <param name="selection"></param>
		/// <param name="focus">if True, focus the editor</param>
		/// <returns></returns>
		public bool SelectRange(EditorSelection selection, bool? focus) {
			ThreadHelper.ThrowIfNotOnUIThread();
			try {
				if (WpfTextView == null || selection == null) return false;
				var range = new Range() { Start = selection.Start, End = selection.End };
				string log = "";
				var rangeLines = WpfTextView.GetLinesFromRange(range.Start.Line, range.End.Line);
				if (rangeLines != null) {
					WpfTextView.Selection.Clear();
					VirtualSnapshotPoint anchorPoint;
					VirtualSnapshotPoint activePoint;
					var startPoint = rangeLines.Item1.Extent.Start + range.Start.Character;

					if (range.IsPoint()) {
						anchorPoint = new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, startPoint));
						activePoint = new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, startPoint));
					}
					else {
						int endPosition = rangeLines.Item2.Extent.End;
						if (range.End.Character != int.MaxValue && rangeLines.Item2.Extent.Start + range.End.Character < endPosition) {
							endPosition = rangeLines.Item2.Extent.Start + range.End.Character;
						}
						anchorPoint = new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, startPoint));
						activePoint = new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, endPosition));
					}
					WpfTextView.Selection.Select(anchorPoint, activePoint);
					log += $"Selecting {nameof(FileName)}={FileName} From {anchorPoint} to {activePoint}";

					var span = new SnapshotSpan(WpfTextView.TextSnapshot, Span.FromBounds(rangeLines.Item1.Start, rangeLines.Item2.End));
					WpfTextView.ViewScroller.EnsureSpanVisible(span, EnsureSpanVisibleOptions.MinimumScroll);
					log += $", ensuring Visible";
					if (selection.Cursor != null) {
						var caretLine = WpfTextView.GetLine(selection.Cursor);
						if (caretLine != null) {
							int startPosition = caretLine.Extent.Start;
							if (selection.Cursor.Character != int.MaxValue && caretLine.Extent.Start + selection.Cursor.Character < caretLine.Extent.End) {
								startPosition = caretLine.Extent.Start + selection.Cursor.Character;
							}
							WpfTextView.Caret.MoveTo(new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, startPosition)));
							WpfTextView.Caret.EnsureVisible();
							log += $", caret to ActivePoint={activePoint.Position}";
						}
					}
				}

				if (focus == true) {
					WpfTextView.VisualElement.Focus();
				}

				log += $", focus={focus}";
				Log.Verbose(log);

				return true;
			}
			catch (Exception ex) {
				Log.Warning(ex, $"{nameof(SelectRange)} Range={@selection} Focus={focus}");
			}

			return false;
		}
	}
}
