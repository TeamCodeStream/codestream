using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Windows;
using System.Windows.Media;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Managers;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.UI;
using CodeStream.VisualStudio.Core.UI.Extensions;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Serilog;

namespace CodeStream.VisualStudio.UI.Margins {
	internal class DocumentMarkScrollbar : FrameworkElement, ICodeStreamWpfTextViewMargin {
		private static readonly ILogger Log = LogManager.ForContext<DocumentMarkScrollbar>();

		private const double MarkPadding = 3.0;
		private const double MarkThickness = 2.0;
		private const double MarkHeight = 6;

		private const int DefaultMarginWidth = 12;
		private static readonly object InitializeLock = new object();

		private readonly IWpfTextView _textView;
		private readonly IVerticalScrollBar _verticalScrollBar;
		private readonly ISessionService _sessionService;

		private bool _hasEvents;
		private bool _initialized;

		private bool _isDisposed;
		private bool _isMarginEnabled;

		private bool _optionsChanging;

		private BackgroundMarkerPlacement _search;

		public DocumentMarkScrollbar(
			IWpfTextViewHost wpfTextViewHost,
			IVerticalScrollBar verticalScrollBar,
			ISessionService sessionService) {
			if (wpfTextViewHost == null) throw new ArgumentNullException(nameof(wpfTextViewHost));

			_sessionService = sessionService;

			_textView = wpfTextViewHost.TextView;
			_verticalScrollBar = verticalScrollBar;

			IsHitTestVisible = false;
			Width = DefaultMarginWidth;

			_textView.Options.OptionChanged += OnOptionChanged;
			IsVisibleChanged += OnViewOrMarginVisibilityChanged;
			_textView.VisualElement.IsVisibleChanged += OnViewOrMarginVisibilityChanged;

			OnOptionChanged(null, null);

			TryInitialize();
		}

		private void TryInitialize() {
			try {
				if (IsReady()) {
					OnSessionReady();
				}
				else {
					TryHideMargin();
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(TryInitialize));
			}
		}

		public FrameworkElement VisualElement {
			get {
				ThrowIfDisposed();
				return this;
			}
		}

		public double MarginSize {
			get {
				ThrowIfDisposed();
				return ActualWidth;
			}
		}

		public bool Enabled {
			get {
				ThrowIfDisposed();
				return _isMarginEnabled;
			}
		}

		public ITextViewMargin GetTextViewMargin(string marginName) {
			return string.Compare(marginName, PredefinedCodestreamNames.DocumentMarkScrollbar,
					   StringComparison.OrdinalIgnoreCase) == 0
				? this
				: null;
		}

		/// <summary>
		///     Handler for layout changed events.
		/// </summary>
		public void OnTextViewLayoutChanged(object sender, TextViewLayoutChangedEventArgs e) {
			if (AnyTextChanges(e.OldViewState.EditSnapshot.Version, e.NewViewState.EditSnapshot.Version)) {
				//There were text changes so we need to recompute possible matches
				UpdateMatches();
			}
		}

		public void OnSessionReady() {
			if (_initialized) {
				return;
			}

			lock (InitializeLock) {
				if (!_initialized) {
					TryShowMargin();
					UpdateMatches(true);
					_initialized = true;
				}
			}
		}

		public bool IsReady() => _sessionService.IsReady;

		public bool CanToggleMargin { get; } = false;

		public void OnSessionLogout() {
			_initialized = false;
			TryHideMargin();
		}

		public void OnMarkerChanged() {
			UpdateMatches(true);
		}

		public bool TryShowMargin() => this.TryShow();

		public bool TryHideMargin() => this.TryHide();

		public void ToggleMargin(bool requestingVisibility) {
			if (requestingVisibility) {
				TryShowMargin();
			}
			else {
				TryHideMargin();
			}
		}

		public void SetAutoHideMarkers(bool autoHideMarkers) {
			// noop
		}

		public void RefreshMargin() => UpdateMatches();

		public void OnZoomChanged(double zoomLevel, Transform transform) {
			// noop
		}

		private void OnOptionChanged(object sender, EditorOptionChangedEventArgs e) {
			var wasMarginEnabled = _isMarginEnabled;
			_isMarginEnabled = _textView.Options.GetOptionValue(DocumentMarkScrollbarMarkersEnabledOption.OptionKey);

			try {
				_optionsChanging = true;

				Visibility = Enabled ? Visibility.Visible : Visibility.Collapsed;
			}
			finally {
				_optionsChanging = false;
			}

			var refreshed = UpdateEventHandlers(true);

			//If the UpdateEventHandlers call above didn't initiate a search then we need to force the adornments and the margin to update
			//to update if they were turned on/off.
			if (!refreshed) {
				if (wasMarginEnabled != _isMarginEnabled) {
					InvalidateVisual();
				}
			}
		}

		private void OnViewOrMarginVisibilityChanged(object sender, DependencyPropertyChangedEventArgs e) {
			//There is no need to update event handlers if the visibility change is the result of an options change (since we will
			//update the event handlers after changing all the options).
			//
			//It is possible this will get called twice in quick succession (when the tab containing the host is made visible, the view and the margin
			//will get visibility changed events).
			if (!_optionsChanging) {
				UpdateEventHandlers(true);
			}
		}

		private bool MarginActive => _isMarginEnabled && IsVisible;

		private bool UpdateEventHandlers(bool checkEvents) {
			var needEvents = checkEvents &&
							 _textView.VisualElement.IsVisible &&
							 MarginActive;

			if (needEvents != _hasEvents) {
				_hasEvents = needEvents;
				if (needEvents) {
					_verticalScrollBar.Map.MappingChanged += OnMappingChanged;

					return UpdateMatches();
				}

				_verticalScrollBar.Map.MappingChanged -= OnMappingChanged;

				if (_search != null) {
					_search.Abort();
					_search = null;
				}
			}

			return false;
		}

		/// <summary>
		///     Handler for the scrollbar changing its coordinate mapping.
		/// </summary>
		private void OnMappingChanged(object sender, EventArgs e) {
			//Simply invalidate the visual: the positions of the various highlights haven't changed.
			InvalidateVisual();
		}

		private static bool AnyTextChanges(ITextVersion oldVersion, ITextVersion currentVersion) {
			while (oldVersion != currentVersion) {
				if (oldVersion.Changes.Count > 0) return true;

				oldVersion = oldVersion.Next;
			}

			return false;
		}

		/// <summary>
		///     Start a background search
		/// </summary>
		/// <returns>
		///     true if a either a search has been queued or if the adornments/margin have been cleared since the highlight was
		///     removed.
		/// </returns>
		private bool UpdateMatches(bool force = false) {
			if (_hasEvents) {
				//Do a new search if the highlight changed, there is no existing search, or the existing search was on the wrong snapshot.
				if (_search == null || _search.Snapshot != _textView.TextSnapshot || force) {
					//The text of the highlight changes ... restart the search.
					if (_search != null) {
						//Stop and blow away the old search (even if it didn't finish, the results are not interesting anymore).
						_search.Abort();
						_search = null;
					}

					//The underlying buffer could be very large, meaning that doing the search for all matches on the UI thread
					//is a bad idea. Do the search on the background thread and use a callback to invalidate the visual when
					//the entire search has completed.
					_search = new BackgroundMarkerPlacement(
						_textView.TextSnapshot,
						_textView,
						delegate {
							ThreadHelper.JoinableTaskFactory.Run(async delegate {
								//Force the invalidate to happen on the UI thread to satisfy WPF
								await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
								//Guard against the view closing before dispatcher executes this.
								if (!_isDisposed) {
									InvalidateVisual();
								}
							});
						});

					return true;
				}
			}

			return false;
		}

		/// <summary>
		///     Override for the FrameworkElement's OnRender. When called, redraw
		///     all of the markers
		/// </summary>
		protected override void OnRender(DrawingContext drawingContext) {
			base.OnRender(drawingContext);

			if (_search == null || Visibility != Visibility.Visible) return;

			try {
				//Take a snapshot of the matches found to date (this could still be changing
				//if the search has not completed yet).
				var matches = _search.Matches;

				var lastY = double.MinValue;
				var markerCount = Math.Min(500, matches.Count);
				for (var i = 0; i < markerCount; ++i) {
					//Get (for small lists) the index of every match or, for long lists, the index of every
					//(count / 1000)th entry. Use longs to avoid any possible integer overflow problems.
					var index = (int)(i * (long)matches.Count / markerCount);
					var snapshotSpanMarker = matches[index];
					var match = snapshotSpanMarker.SnapshotSpan.Start;

					//Translate the match from its snapshot to the view's current snapshot (the versions should be the same,
					//but this will handle it if -- for some reason -- they are not).
					var y = Math.Floor(
						_verticalScrollBar.GetYCoordinateOfBufferPosition(match.TranslateTo(_textView.TextSnapshot,
							PointTrackingMode.Negative)));
					if (y + MarkThickness > lastY) {
						lastY = y;
						var rectX = 6;
						var rectY = y - MarkThickness * 0.75;
						var rectWidth = Width - MarkPadding * 2.0;
						var rectHeight = MarkHeight;

						drawingContext.DrawRectangle(new SolidColorBrush(snapshotSpanMarker.Color.ConvertToMediaColor()), null,
							new Rect(
								x: rectX,
								y: rectY,
								width: rectWidth,
								height: rectHeight)
						);
					}
				}
			}
			catch (Exception ex) {
				Log.Debug(ex, "drawingContext");
			}
		}

		private void ThrowIfDisposed() {
			if (_isDisposed)
				throw new ObjectDisposedException(PredefinedCodestreamNames.DocumentMarkScrollbar);
		}

		protected virtual void Dispose(bool disposing) {
			if (_isDisposed) return;

			if (disposing) {
				_textView.Options.OptionChanged -= OnOptionChanged;
				IsVisibleChanged -= OnViewOrMarginVisibilityChanged;
				_textView.VisualElement.IsVisibleChanged -= OnViewOrMarginVisibilityChanged;

				UpdateEventHandlers(false);
			}

			_isDisposed = true;
		}

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		 

		private class BackgroundMarkerPlacement {
			private static readonly List<SnapshotSpanMarker> EmptyList = new List<SnapshotSpanMarker>(0);
			public ITextSnapshot Snapshot { get; }
			private bool _abort;
			private List<DocumentMarker> _markers;

			/// <summary>
			/// Call <paramref name="completionCallback" /> once the search has completed.
			/// </summary>
			/// <param name="snapshot">Text snapshot in which to search.</param>
			/// <param name="textView"></param>
			/// <param name="completionCallback">Delegate to call if the search is completed (will be called on the UI thread).</param>
			/// <remarks>The constructor must be called from the UI thread.</remarks>
			public BackgroundMarkerPlacement(ITextSnapshot snapshot, ITextView textView, Action completionCallback) {
				Snapshot = snapshot;
				var textView1 = textView;

				ThreadPool.QueueUserWorkItem(delegate {
					//Lower our priority so that we do not compete with the rendering.
					Thread.CurrentThread.Priority = ThreadPriority.Lowest;
					Thread.CurrentThread.IsBackground = true;

					var newMatches = new List<SnapshotSpanMarker>();

					if (textView1.Properties.ContainsProperty(PropertyNames.DocumentMarkers)) {
						_markers = textView1.Properties.GetProperty<List<DocumentMarker>>(PropertyNames.DocumentMarkers);
					}

					if (_markers == null) return;
					// filter out any missing codemarks
					_markers = _markers.Where(_ => _.Codemark != null).ToList();

					// we want all markers, those with Codemarks as well as those without (externalContent)
					foreach (var span in snapshot.Lines) {
						if (_abort) break;

						var lineNumber = span.Start.GetContainingLine().LineNumber;
						var marker = _markers.FirstOrDefault(_ => _?.Range?.Start.Line == lineNumber);
						if (marker == null) continue;

						var start = span.Start == 0 ? span.Start : span.Start - 1;
						newMatches.Add(new SnapshotSpanMarker(new SnapshotSpan(start, 1), ThemeManager.GetCodemarkColorSafe(marker?.Color)));
					}

					if (_abort) return;

					//This should be a thread safe operation since it is atomic
					Matches = newMatches;

					completionCallback();
				});
			}

			public IList<SnapshotSpanMarker> Matches { get; private set; } = EmptyList;

			public void Abort() {
				_abort = true;
			}
		}

		private class SnapshotSpanMarker {
			public SnapshotSpanMarker(SnapshotSpan snapshotSpan, System.Drawing.Color color) {
				SnapshotSpan = snapshotSpan;
				Color = color;
			}

			public SnapshotSpan SnapshotSpan { get; }
			public System.Drawing.Color Color { get; }
		}
	}
}
