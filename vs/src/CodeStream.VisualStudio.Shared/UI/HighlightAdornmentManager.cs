using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;
using Serilog;

namespace CodeStream.VisualStudio.Core.Adornments {
	public interface ICanHighlightRange {
		void RemoveAllHighlights();
		bool Highlight(Range range, bool highlight);
	}

	public interface ICanSelectRange {
		bool SelectRange(EditorSelection selection, bool? focus);
	}

	/// <summary>
	/// Requires UI thread
	/// </summary>
	public class HighlightAdornmentManager : ICanHighlightRange, IDisposable {
		private static readonly ILogger Log = LogManager.ForContext<HighlightAdornmentManager>();

		private readonly IAdornmentLayer _highlightAdornmentLayer;
		private readonly IWpfTextView _textView;
		private readonly Dictionary<int, ITextViewLine> _lineInfos;

		/// <summary>
		/// Requires UI thread
		/// </summary>
		public HighlightAdornmentManager(IWpfTextView textView) {
			_textView = textView;
			_lineInfos = new Dictionary<int, ITextViewLine>();
			_highlightAdornmentLayer = textView.GetAdornmentLayer(PropertyNames.TextViewCreationListenerLayerName);

			textView.LayoutChanged += OnLayoutChanged;
			//textView.ViewportWidthChanged += OnViewportWidthChanged;
			textView.ViewportLeftChanged += OnViewportLeftChanged;
			CreateLineInfos(_textView, _textView.TextViewLines);
		}

		public void RemoveAllHighlights() {
			_highlightAdornmentLayer.RemoveAllAdornments();
		}

		public bool Highlight(Range range, bool highlight) {
			ThreadHelper.ThrowIfNotOnUIThread();

			if (!highlight) {
				_highlightAdornmentLayer.RemoveAllAdornments();
				return false;
			}

			CreateLineInfos(_textView, _textView.TextViewLines);

			try {
				var brush = CreateBrush();

				range = range.Normalize();
				var lineStart = range.Start.Line;
				var lineEnd = range.End.Line;

				for (var i = range.Start.Line; i <= range.End.Line; i++) {
					var isInnerOrLastLine = i > range.Start.Line && i <= range.End.Line;
					if (!_lineInfos.TryGetValue(i, out ITextViewLine lineInfo)) {
						if (Log.IsVerboseEnabled()) {
							try {
								var visible = _textView.TextViewLines.AsQueryable().Select(_ =>
									_textView.TextSnapshot.GetLineNumberFromPosition(_.Extent.Start.Position)
								).ToList();
								if (visible.Count() >= 1) {
									Log.Verbose($"Could not find lineInfo for line={i}, only lines {visible.First()}-{visible.Last()} are visible");
								}
							}
							catch (Exception ex) {
								Log.Verbose(ex, $"Problem with logging message for line={i}");
							}
						}
						continue;
					}

					Placement placement;
					if (lineStart == lineEnd) {
						//single line
						var length = range.End.Character == int.MaxValue
							? lineInfo.Extent.End.Position - lineInfo.Extent.Start.Position
							: range.End.Character - range.Start.Character;
						if (length == 0) {
							//highlight whole line
							placement = new Placement(_textView.ViewportLeft, _textView.ViewportWidth);
						}
						else {
							placement = _textView
								.GetGeometryPlacement(new SnapshotSpan(lineInfo.Extent.Snapshot,
									new Span(lineInfo.Extent.Start + range.Start.Character, length)));
						}
					}
					else {
						if (i == lineStart) {
							var startPosition = range.Start.Character + lineInfo.Extent.Start;
							var endLength = startPosition >= lineInfo.Extent.End.Position
								? 1
								: lineInfo.Extent.End.Position - Math.Max(startPosition, 0);
							placement = _textView
								.GetGeometryPlacement(new SnapshotSpan(lineInfo.Extent.Snapshot,
									new Span(startPosition, endLength)));
						}
						else if (i == lineEnd) {
							var endLength = range.End.Character == int.MaxValue
								? lineInfo.Extent.End.Position - lineInfo.Extent.Start.Position
								: range.End.Character;
							placement = _textView
								.GetGeometryPlacement(new SnapshotSpan(lineInfo.Extent.Snapshot,
									new Span(lineInfo.Extent.Start, endLength)));
						}
						else {
							// some middle line
							placement = _textView.GetGeometryPlacement(lineInfo.Extent);
						}
					}

					var rectangleHeight = lineInfo.TextHeight + 1.35; //buffer ;)
					if (lineInfo.Height > rectangleHeight) {
						// height _might_ be taller than line height because of codelenses
						if (isInnerOrLastLine) {
							rectangleHeight = lineInfo.Height + 0.5; //buffer :)
						}
					}

					var element = new Rectangle {
						Height = rectangleHeight,
						Width = placement.Width,
						Fill = brush
					};

					Canvas.SetLeft(element, range.Start.Character == 0 ? (int)_textView.ViewportLeft : placement.Left);
					Canvas.SetTop(element, isInnerOrLastLine ? lineInfo.Top : lineInfo.TextTop);

					_highlightAdornmentLayer.AddAdornment(lineInfo.Extent, null, element);
				}

				return true;
			}
			catch (ArgumentException ex) {
				Log.Debug(ex, $"{range?.ToJson()}");
			}
			catch (Exception ex) {
				Log.Warning(ex, $"{range?.ToJson()}");
			}
			return false;
		}

		private SolidColorBrush CreateBrush() {
			var themedColor = VSColorTheme.GetThemedColor(EnvironmentColors.ScrollBarBackgroundColorKey);
			var brush = new SolidColorBrush(Color.FromRgb(themedColor.R, themedColor.G, themedColor.B));
			if (brush.CanFreeze) {
				brush.Freeze();
			}

			return brush;
		}

		/// <summary>
		/// Populates (or refreshes) the cache that stores all the lineInfo data.
		/// It's stored in a dictionary for easy lookup later when highlighting
		/// based on start/end lines.
		/// </summary>
		/// <param name="textView"></param>
		/// <param name="textViewLines"></param>
		private void CreateLineInfos(ITextView textView, IEnumerable<ITextViewLine> textViewLines) {
			_lineInfos.Clear();
			try {
				if (textViewLines == null || textView.IsClosed) return;

				foreach (var line in textViewLines) {
					// GetLineNumberFromPosition is 0-based
					var lineNumber = textView.TextSnapshot.GetLineNumberFromPosition(line.Extent.Start.Position);
					if (_lineInfos.ContainsKey(lineNumber)) {
						_lineInfos.Remove(lineNumber);
					}
					_lineInfos.Add(lineNumber, line);
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(CreateLineInfos));
			}
		}

		private void OnViewportLeftChanged(object sender, EventArgs e) {
			if (!(sender is IWpfTextView textView)) return;

			foreach (var element in _highlightAdornmentLayer.Elements) {
				Canvas.SetLeft((Rectangle)element.Adornment, textView.ViewportLeft);
			}
		}

		//void OnViewportWidthChanged(object sender, EventArgs e)
		//{
		//    IWpfTextView textView = (IWpfTextView)sender;
		//    foreach (var r in this._highlightAdornmentLayer.Elements)
		//    {
		//        ((Rectangle)r.Adornment).Width = textView.ViewportWidth;
		//    }
		//}

		private void OnLayoutChanged(object sender, TextViewLayoutChangedEventArgs e) {
			if (!(sender is IWpfTextView textView)) return;

			// the ITextView disposes its ITextViewLineCollection and all the ITextViewLines it
			// contains every time it generates a new layout
			//...so we can't cache them.
			_highlightAdornmentLayer.RemoveAllAdornments();
			CreateLineInfos(textView, textView.TextViewLines);
		}

		private bool _disposed = false;

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed) return;

			if (disposing) {
				_textView.LayoutChanged -= OnLayoutChanged;
				// _textView.ViewportWidthChanged -= OnViewportWidthChanged;
				_textView.ViewportLeftChanged -= OnViewportLeftChanged;
				_lineInfos.Clear();
			}

			_disposed = true;
		}
	}
}
