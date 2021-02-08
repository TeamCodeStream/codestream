using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Logging.Instrumentation;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Core.UI;
using CodeStream.VisualStudio.Core.UI.Adornments;
using CodeStream.VisualStudio.Core.UI.Extensions;
using CodeStream.VisualStudio.UI.Margins;
using Microsoft.VisualStudio.Editor;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.TextManager.Interop;
using Microsoft.VisualStudio.Utilities;
using Serilog;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel.Composition;
using System.Diagnostics;
using System.Linq;
using System.Reactive.Concurrency;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.UI {
	public class TextViewCreationListenerLogger { }

	[Export(typeof(IVsTextViewCreationListener))]
	[Export(typeof(IWpfTextViewConnectionListener))]
	[ContentType(ContentTypes.Text)]
	[TextViewRole(PredefinedTextViewRoles.Interactive)]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
	[TextViewRole(PredefinedTextViewRoles.Editable)]
	public class TextViewCreationListener :
		IVsTextViewCreationListener,
		IWpfTextViewConnectionListener {
		private readonly ILogger Log = LogManager.ForContext<TextViewCreationListenerLogger>();
		private IWpfTextView _focusedWpfTextView;
		private static readonly object InitializedLock = new object();

		internal const string LayerName = CodeStream.VisualStudio.Core.UI.PropertyNames.TextViewCreationListenerLayerName;

		private static readonly object WeakTableLock = new object();
		private static readonly ConditionalWeakTable<ITextBuffer, HashSet<IWpfTextView>> TextBufferTable =
			new ConditionalWeakTable<ITextBuffer, HashSet<IWpfTextView>>();

		[Import]
		public ICodeStreamAgentServiceFactory CodeStreamAgentServiceFactory { get; set; }
		[Import]
		public ICodeStreamService CodeStreamService { get; set; }
		[Import]
		public ISessionService SessionService { get; set; }
		[Import]
		public IEventAggregator EventAggregator { get; set; }
		[Import]
		public IEditorService EditorService { get; set; }
		[Import]
		public IWpfTextViewCache TextViewCache { get; set; }
		[Import]
		public IVsEditorAdaptersFactoryService EditorAdaptersFactoryService { get; set; }
		[Import]
		public ITextDocumentFactoryService TextDocumentFactoryService { get; set; }
		[ImportMany]
		public IEnumerable<IWpfTextViewMarginProvider> TextViewMarginProviders { get; set; }

		/// <summary>
		/// This is needed for the Highlight adornment layer
		/// </summary>
		[Export(typeof(AdornmentLayerDefinition))]
		[Name(LayerName)]
		[Order(Before = PredefinedAdornmentLayers.Selection)]
		[TextViewRole(PredefinedTextViewRoles.Interactive)]
		[TextViewRole(PredefinedTextViewRoles.Document)]
		[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
		[TextViewRole(PredefinedTextViewRoles.Editable)]
		public AdornmentLayerDefinition AlternatingLineColor = null;

		/// <summary>
		/// SubjectBuffersConnected happens first
		/// </summary>
		/// <param name="wpfTextView"></param>
		/// <param name="reason"></param>
		/// <param name="subjectBuffers"></param>
		public void SubjectBuffersConnected(IWpfTextView wpfTextView, ConnectionReason reason, Collection<ITextBuffer> subjectBuffers) {
			try {
				var logPrefix = $"{nameof(SubjectBuffersConnected)}";
				using (var metrics = Log.WithMetrics($"{logPrefix} ")) {
					if (wpfTextView == null || !wpfTextView.HasValidDocumentRoles()) return;

					IVirtualTextDocument virtualTextDocument = null;
					if (!TextDocumentExtensions.TryGetTextDocument(TextDocumentFactoryService, wpfTextView, out virtualTextDocument)) {
						Log.Warning($"{logPrefix} Could not create virtualTextDocument");
						return;
					}

					Log.Verbose($"{logPrefix} pre-Lock");
					lock (WeakTableLock) {
						Log.Verbose($"{logPrefix} in-Lock");
						foreach (var buffer in subjectBuffers) {
							if (!TextBufferTable.TryGetValue(buffer, out HashSet<IWpfTextView> textViews)) {
								textViews = new HashSet<IWpfTextView>();
								TextBufferTable.Add(buffer, textViews);
							}

							textViews.Add(wpfTextView);
						}
						using (metrics.Measure($"{logPrefix} Building properties")) {
							if (virtualTextDocument.SupportsMarkers) {
								wpfTextView.Properties.GetOrCreateSingletonProperty(PropertyNames.DocumentMarkerManager,
									() => new DocumentMarkerManager(CodeStreamAgentServiceFactory.Create(), wpfTextView, virtualTextDocument));
							}
							wpfTextView.Properties.GetOrCreateSingletonProperty(PropertyNames.TextViewDocument, () => virtualTextDocument);
							wpfTextView.Properties.GetOrCreateSingletonProperty(PropertyNames.TextViewState, () => new TextViewState());
#if DEBUG
							if (TextViewCache == null) {
								System.Diagnostics.Debugger.Break();
							}
#endif
						}
						TextViewCache.Add(virtualTextDocument, wpfTextView);
					}
					Log.Verbose($"{logPrefix} Uri={virtualTextDocument.Uri}");
				}

			}
			catch (Exception ex) {
				Log.Error(ex, nameof(SubjectBuffersConnected));
			}
		}

		/// <summary>
		/// VsTextViewCreated is created after all margins, etc.
		/// </summary>
		/// <param name="textViewAdapter"></param>
		public void VsTextViewCreated(IVsTextView textViewAdapter) {
			try {
				IWpfTextView wpfTextView;
				List<ICodeStreamWpfTextViewMargin> textViewMarginProviders = null;
				using (var metrics = Log.WithMetrics($"{nameof(VsTextViewCreated)}")) {
					wpfTextView = EditorAdaptersFactoryService.GetWpfTextView(textViewAdapter);
					if (wpfTextView == null || !wpfTextView.HasValidDocumentRoles()) return;

					using (metrics.Measure($"{nameof(VsTextViewCreated)} created margins")) {
						// find all of our textView margin providers (they should already have been created at this point)
						textViewMarginProviders = TextViewMarginProviders
							.Where(_ => _ as ICodeStreamMarginProvider != null)
							.Select(_ => (_ as ICodeStreamMarginProvider)?.TextViewMargin)
							.Where(_ => _ != null)
							.ToList();

						if (!textViewMarginProviders.AnySafe()) {
							Log.LocalWarning($"No {nameof(textViewMarginProviders)}");
						}
					}

					wpfTextView.Properties.AddProperty(PropertyNames.TextViewMarginProviders, textViewMarginProviders);
					Debug.Assert(EventAggregator != null, nameof(EventAggregator) + " != null");
					using (metrics.Measure($"{nameof(VsTextViewCreated)} CreatedDisposables")) {
						var textViewLayoutChangedSubject = new Subject<TextViewLayoutChangedSubject>();
						var caretPositionChangedSubject = new Subject<CaretPositionChangedSubject>();
						var textSelectionChangedSubject = new Subject<TextSelectionChangedSubject>();
						// some are listening on the main thread since we have to change the UI state
						var disposables = new List<IDisposable> {
							EventAggregator.GetEvent<SessionReadyEvent>()
								.ObserveOn(Scheduler.Default)
								.Subscribe(e => {
									Log.Verbose(
										$"{nameof(VsTextViewCreated)} SessionReadyEvent Session IsReady={SessionService.IsReady}");
									if (SessionService.IsReady) {
										_ = OnSessionReadyAsync(wpfTextView);
									}
								}),
							EventAggregator.GetEvent<SessionLogoutEvent>()
								.ObserveOnApplicationDispatcher()
								.Subscribe(_ => OnSessionLogout(wpfTextView, textViewMarginProviders)),

							EventAggregator.GetEvent<MarkerGlyphVisibilityEvent>()
								.ObserveOnApplicationDispatcher()
								.Subscribe(_ => textViewMarginProviders.Toggle(_.IsVisible)),

							EventAggregator.GetEvent<AutoHideMarkersEvent>()
								.ObserveOnApplicationDispatcher()
								.Subscribe(_ => textViewMarginProviders.SetAutoHideMarkers(_.Value)),

							textViewLayoutChangedSubject.Throttle(TimeSpan.FromMilliseconds(150))
								.ObserveOn(Scheduler.Default)
								.Subscribe(subject => { _ = OnTextViewLayoutChangedSubjectHandlerAsync(subject); }),

							caretPositionChangedSubject.Throttle(TimeSpan.FromMilliseconds(200))
								.ObserveOnApplicationDispatcher()
								.Subscribe(subject => { _ = OnCaretPositionChangedSubjectHandlerAsync(subject); }),

							textSelectionChangedSubject.Throttle(TimeSpan.FromMilliseconds(200))
								.ObserveOnApplicationDispatcher()
								.Subscribe(subject => { _ = OnTextSelectionChangedSubjectHandlerAsync(subject); })
						};

						wpfTextView.Properties.AddProperty(PropertyNames.TextViewEvents, disposables);
						wpfTextView.Properties.AddProperty(PropertyNames.TextViewLayoutChangedSubject,
							textViewLayoutChangedSubject);
						wpfTextView.Properties.AddProperty(PropertyNames.CaretPositionChangedSubject,
							caretPositionChangedSubject);
						wpfTextView.Properties.AddProperty(PropertyNames.TextSelectionChangedSubject,
							textSelectionChangedSubject);
					}
				}

				using (var metrics = Log.WithMetrics($"{nameof(VsTextViewCreated)}:OnSessionReady Session IsReady={SessionService.IsReady}")) {
					if (SessionService.IsReady) {
						_ = OnSessionReadyAsync(wpfTextView);
					}
					else {
						textViewMarginProviders.Hide();
						using (metrics.Measure($"{nameof(VsTextViewCreated)} {nameof(ChangeActiveEditor)}")) {
							ChangeActiveEditor(wpfTextView, metrics);
						}
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(VsTextViewCreated));
			}
		}

		public void SubjectBuffersDisconnected(IWpfTextView wpfTextView, ConnectionReason reason, Collection<ITextBuffer> subjectBuffers) {
			try {
				using (Log.WithMetrics($"{nameof(SubjectBuffersDisconnected)}")) {
					if (wpfTextView == null || !wpfTextView.HasValidDocumentRoles()) return;
					if (!wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument textViewDocument)) return;

					lock (WeakTableLock) {
						// we need to check all buffers reported since we will be called after actual changes have happened.
						// for example, if content type of a buffer changed, we will be called after it is changed, rather than before it.
						foreach (var buffer in subjectBuffers) {
							if (TextBufferTable.TryGetValue(buffer, out HashSet<IWpfTextView> textViews)) {
								textViews.Remove(wpfTextView);
								var textViewDocumentId = textViewDocument.Id;
								TextViewCache.Remove(textViewDocument, wpfTextView);

								if (textViews.Count == 0) {
									TextBufferTable.Remove(buffer);

									wpfTextView.LayoutChanged -= OnTextViewLayoutChanged;
									wpfTextView.Caret.PositionChanged -= Caret_PositionChanged;
									wpfTextView.GotAggregateFocus -= TextView_GotAggregateFocus;
									wpfTextView.Selection.SelectionChanged += Selection_SelectionChanged;
									wpfTextView.ZoomLevelChanged -= OnZoomLevelChanged;

									wpfTextView.Properties.RemovePropertySafe(PropertyNames.TextViewDocument);
									wpfTextView.Properties.RemovePropertySafe(PropertyNames.TextViewState);
									wpfTextView.Properties.RemovePropertySafe(PropertyNames.DocumentMarkers);
									wpfTextView.Properties.RemovePropertySafe(PropertyNames.DocumentMarkerManager);
									wpfTextView.Properties.RemovePropertySafe(PropertyNames.TextViewMarginProviders);
									wpfTextView.Properties.TryDisposeProperty<HighlightAdornmentManager>(PropertyNames.AdornmentManager);

									wpfTextView.Properties.TryDisposeProperty<Subject<TextViewLayoutChangedSubject>>(PropertyNames.TextViewLayoutChangedSubject);
									wpfTextView.Properties.TryDisposeProperty<Subject<CaretPositionChangedSubject>>(PropertyNames.CaretPositionChangedSubject);
									wpfTextView.Properties.TryDisposeProperty<Subject<TextSelectionChangedSubject>>(PropertyNames.TextSelectionChangedSubject);

									wpfTextView.Properties.TryDisposeListProperty(PropertyNames.TextViewEvents);
									wpfTextView.Properties.TryDisposeListProperty(PropertyNames.TextViewLocalEvents);
									Log.Verbose($"{nameof(SubjectBuffersDisconnected)} virtualTextViewDocumentId={textViewDocumentId}");
								}
							}
						}

						if (TextViewCache.Count() == 0) {
							ResetActiveEditor();
						}
					}
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(SubjectBuffersDisconnected));
			}
		}

		public System.Threading.Tasks.Task OnSessionReadyAsync(IWpfTextView wpfTextView) {
			return System.Threading.Tasks.Task.Run(async delegate {
				await TaskScheduler.Default;
				try {
					if (wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewState, out TextViewState state)) {
						if (state != null && !state.Initialized) {
							var logPrefix = $"{nameof(OnSessionReadyAsync)}";
							using (var metrics = Log.WithMetrics($"{logPrefix} (background)")) {
								metrics.Log($"{logPrefix} state=initializing");
								wpfTextView.Properties.AddProperty(PropertyNames.TextViewLocalEvents,
									new List<IDisposable> {
										EventAggregator.GetEvent<DocumentMarkerChangedEvent>()
											.ObserveOn(Scheduler.Default)
											.Subscribe(e => {
												Log.Verbose(
													$"{nameof(DocumentMarkerChangedEvent)} State={state?.Initialized}, _={e?.Uri}");
												_ = OnDocumentMarkerChangedAsync(wpfTextView, e);
											}),
										EventAggregator.GetEvent<UserPreferencesChangedEvent>()
											.ObserveOn(Scheduler.Default)
											.Subscribe(e => {
												Log.Verbose(
													$"{nameof(UserPreferencesChangedEvent)} State={state?.Initialized}");
												_ = OnUserPreferencesChangedAsync(wpfTextView, e);
											})
									});

								using (metrics.Measure($"{logPrefix} TrySetMarkers")) {
									if (wpfTextView.Properties.TryGetProperty(PropertyNames.DocumentMarkerManager,
											out DocumentMarkerManager documentMarkerManager) &&
										documentMarkerManager != null) {
										await documentMarkerManager.TrySetMarkersAsync(true);
									}
								}
							}

							await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
							using (var metrics = Log.WithMetrics($"{logPrefix} (UI)")) {
								wpfTextView.Properties.AddProperty(PropertyNames.AdornmentManager,
									new HighlightAdornmentManager(wpfTextView));
								using (metrics.Measure($"{logPrefix} ICodeStreamWpfTextViewMargin.OnSessionReady()")) {
									wpfTextView
										.Properties
										.GetProperty<List<ICodeStreamWpfTextViewMargin>>(PropertyNames
											.TextViewMarginProviders)
										.OnSessionReady();
								}

								// keep this at the end -- we want this to be the first handler
								wpfTextView.LayoutChanged += OnTextViewLayoutChanged;
								wpfTextView.Caret.PositionChanged += Caret_PositionChanged;
								wpfTextView.GotAggregateFocus += TextView_GotAggregateFocus;
								wpfTextView.Selection.SelectionChanged += Selection_SelectionChanged;
								wpfTextView.ZoomLevelChanged += OnZoomLevelChanged;

								ChangeActiveEditor(wpfTextView, metrics);
								SetZoomLevelCore(wpfTextView.ZoomLevel, metrics);
								using (metrics.Measure($"{logPrefix} OnMarkerChanged")) {
									wpfTextView
										.Properties
										.GetProperty<List<ICodeStreamWpfTextViewMargin>>(PropertyNames
											.TextViewMarginProviders)
										.OnMarkerChanged();
								}

								metrics.Log($"{logPrefix} state=true");
								state.Initialized = true;
							}
						}
					}
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(OnSessionReadyAsync)}");
				}
			});
		}

		private void SetZoomLevelCore(double zoomLevel, IMetricsBase metrics) {
			using (metrics?.Measure($"{nameof(SetZoomLevelCore)}")) {
				if (!SessionService.IsWebViewVisible) return;

				CodeStreamService?.BrowserService?.SetZoomInBackground(zoomLevel);
			}
		}

		private void OnZoomLevelChanged(object sender, ZoomLevelChangedEventArgs e) {
			Log.Verbose($"{nameof(OnZoomLevelChanged)}");
			using (var metrics = Log.WithMetrics($"{nameof(OnZoomLevelChanged)}")) {
				SetZoomLevelCore(e.NewZoomLevel, metrics);
			}
		}

		private void ResetActiveEditor() {
			try {
				using (var metrics = Log.WithMetrics(nameof(ResetActiveEditor))) {
					_ = CodeStreamService.ResetActiveEditorAsync();
					_focusedWpfTextView = null;
					SessionService.LastActiveFileUri = null;
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(ResetActiveEditor));
			}
		}

		private void ChangeActiveEditor(IWpfTextView wpfTextView, IMetricsBase metrics = null) {
			try {
				using (metrics?.Measure($"{nameof(ChangeActiveEditor)}")) {
					if (wpfTextView == null || !SessionService.IsWebViewVisible) return;
					if (!wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument)) return;
					if (virtualTextDocument == null) return;

					var activeTextEditor = EditorService.CreateActiveTextEditor(virtualTextDocument, wpfTextView);
					if (activeTextEditor != null) {
						_ = CodeStreamService.ChangeActiveEditorAsync(virtualTextDocument.Uri, activeTextEditor);
						SetZoomLevelCore(wpfTextView.ZoomLevel, metrics);
					}
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(ChangeActiveEditor));
			}
		}

		private void OnSessionLogout(IWpfTextView wpfTextView, List<ICodeStreamWpfTextViewMargin> textViewMarginProviders) {
			try {
				if (wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewState, out TextViewState state)) {
					state.Initialized = false;
				}

				wpfTextView.Properties.TryDisposeListProperty(PropertyNames.TextViewLocalEvents);
				wpfTextView.Properties.TryDisposeProperty<HighlightAdornmentManager>(PropertyNames.AdornmentManager);
				wpfTextView.LayoutChanged -= OnTextViewLayoutChanged;
				wpfTextView.Caret.PositionChanged -= Caret_PositionChanged;
				wpfTextView.Selection.SelectionChanged += Selection_SelectionChanged;
				wpfTextView.GotAggregateFocus -= TextView_GotAggregateFocus;

				if (wpfTextView.Properties.TryGetProperty(PropertyNames.DocumentMarkerManager,
					out DocumentMarkerManager documentMarkerManager) && documentMarkerManager != null) {
					documentMarkerManager.Reset();
				}

				textViewMarginProviders.OnSessionLogout();
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(OnSessionLogout));
			}
		}

		private System.Threading.Tasks.Task OnDocumentMarkerChangedAsync(IWpfTextView wpfTextView, DocumentMarkerChangedEvent e) {
			return System.Threading.Tasks.Task.Run(async delegate {
				await TaskScheduler.Default;
				using (var metrics = Log.WithMetrics(nameof(OnDocumentMarkerChangedAsync))) {
					if (!wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument)) {
						return;
					}

					var fileUri = virtualTextDocument.Uri;
					try {
						if (e.Uri.EqualsIgnoreCase(fileUri)) {
							metrics.Log($"{nameof(DocumentMarkerChangedEvent)} for {fileUri}");
							using (metrics.Measure("TrySetMarkers")) {
								await wpfTextView
									.Properties
									.GetProperty<DocumentMarkerManager>(PropertyNames.DocumentMarkerManager)
									?.TrySetMarkersAsync(true);
							}

							using (metrics.Measure("OnMarkerChanged")) {
								wpfTextView
									.Properties
									.GetProperty<List<ICodeStreamWpfTextViewMargin>>(PropertyNames
										.TextViewMarginProviders)
									.OnMarkerChanged();
							}
						}
						else {
							Log.Verbose($"{nameof(DocumentMarkerChangedEvent)} ignored for {fileUri}");
						}
					}
					catch (Exception ex) {
						Log.Warning(ex, $"{nameof(DocumentMarkerChangedEvent)} for {fileUri}");
					}
				}
			});
		}

		private System.Threading.Tasks.Task OnUserPreferencesChangedAsync(IWpfTextView wpfTextView, UserPreferencesChangedEvent e) {
			return System.Threading.Tasks.Task.Run(async delegate {
				await TaskScheduler.Default;
				using (var metrics = Log.WithMetrics(nameof(OnUserPreferencesChangedAsync))) {
					if (!wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument)) {
						return;
					}

					try {
						using (metrics.Measure("TrySetMarkers")) {
							await wpfTextView
								.Properties
								.GetProperty<DocumentMarkerManager>(PropertyNames.DocumentMarkerManager)
								?.TrySetMarkersAsync(true);
						}
						using (metrics.Measure("OnMarkerChanged")) {
							wpfTextView
								.Properties
								.GetProperty<List<ICodeStreamWpfTextViewMargin>>(PropertyNames
									.TextViewMarginProviders)
								.OnMarkerChanged();
						}
					}
					catch (Exception ex) {
						Log.Warning(ex, $"{nameof(UserPreferencesChangedEvent)}");
					}
				}
			});
		}

		#region EventHandlers

		private void Caret_PositionChanged(object sender, CaretPositionChangedEventArgs e) {
			if (e.TextView == null || !SessionService.IsReady || !SessionService.IsWebViewVisible || !SessionService.IsCodemarksForFileVisible) return;
			var wpfTextView = e.TextView as IWpfTextView;
			if (wpfTextView == null) return;

			wpfTextView
				.Properties
				.GetProperty<Subject<CaretPositionChangedSubject>>(PropertyNames.CaretPositionChangedSubject)
				?.OnNext(new CaretPositionChangedSubject(wpfTextView, sender, e));
		}

		private void Selection_SelectionChanged(object sender, EventArgs e) {
			if (!SessionService.IsReady || !SessionService.IsWebViewVisible) return;

			var textSelection = sender as ITextSelection;
			if (textSelection == null || textSelection.IsEmpty) return;

			var wpfTextView = textSelection.TextView as IWpfTextView;

			wpfTextView
				.Properties
				.GetProperty<Subject<TextSelectionChangedSubject>>(PropertyNames.TextSelectionChangedSubject)
				?.OnNext(new TextSelectionChangedSubject(wpfTextView, textSelection));
		}

		private void TextView_GotAggregateFocus(object sender, EventArgs e) {
			if (!(sender is IWpfTextView wpfTextView)) return;

			if (_focusedWpfTextView == null || _focusedWpfTextView != wpfTextView) {
				ChangeActiveEditor(wpfTextView, null);
				_focusedWpfTextView = wpfTextView;

				if (wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument)) {
					SessionService.LastActiveFileUri = virtualTextDocument.Uri;
				}
			}
		}

		private void OnTextViewLayoutChanged(object sender, TextViewLayoutChangedEventArgs e) {
			try {
				if (!(sender is IWpfTextView wpfTextView) || !SessionService.IsReady) return;
				if (wpfTextView.InLayout || wpfTextView.IsClosed) return;

				// don't trigger for changes that don't result in lines being added or removed
				var triggerTextViewLayoutChanged = (e.VerticalTranslation ||
													e.NewViewState.ViewportTop != e.OldViewState.ViewportTop ||
													e.NewViewState.ViewportBottom != e.OldViewState.ViewportBottom) &&
												   SessionService.IsWebViewVisible && SessionService.IsCodemarksForFileVisible;

				var requiresMarkerCheck = false;
				if (wpfTextView.Properties.TryGetProperty(PropertyNames.DocumentMarkerManager, out DocumentMarkerManager documentMarkerManager) && documentMarkerManager != null) {
					var hasTranslatedLines = e.TranslatedLines.Any();
					var hasNewOrReformattedLines = e.NewOrReformattedLines.Any();

					// get markers if it's null (first time) or we did something that isn't scrolling/vertical changes
					// backspace has a NewOrReformatted Count of 1 :)
					// ENTER-ing beyond the viewport results in e.VerticalTranslation && hasNewOrReformattedLines
					if ((e.VerticalTranslation && hasNewOrReformattedLines) || (hasTranslatedLines && hasNewOrReformattedLines && e.NewOrReformattedLines.Any()) || !documentMarkerManager.IsInitialized()) {
						requiresMarkerCheck = true;
					}
					else if ((e.VerticalTranslation || hasTranslatedLines) && documentMarkerManager.HasMarkers()) {
						triggerTextViewLayoutChanged = true;
					}
				}

				if (triggerTextViewLayoutChanged || requiresMarkerCheck) {
					try {
						wpfTextView.Properties
							.GetProperty<Subject<TextViewLayoutChangedSubject>>(PropertyNames.TextViewLayoutChangedSubject)
							?.OnNext(new TextViewLayoutChangedSubject(wpfTextView, sender, e) {
								RequiresMarkerCheck = requiresMarkerCheck,
								TriggerTextViewLayoutChanged = triggerTextViewLayoutChanged
							});
					}
					catch (InvalidOperationException ex) {
						Log.Error(ex, nameof(OnTextViewLayoutChanged));
					}
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(OnTextViewLayoutChanged));
			}
		}

		#endregion

		#region SubjectHandlers

		private async System.Threading.Tasks.Task OnTextSelectionChangedSubjectHandlerAsync(TextSelectionChangedSubject subject) {
			try {
				using (var metrics = Log.WithMetrics(nameof(OnTextSelectionChangedSubjectHandlerAsync))) {
					Debug.WriteLine($"{nameof(OnTextSelectionChangedSubjectHandlerAsync)} {subject.TextSelection.ToPositionString()}");
					var wpfTextView = subject.WpfTextView;
					var activeEditorState = EditorService?.GetEditorState(wpfTextView);

					if (wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument) &&
						virtualTextDocument != null) {
						_ = CodeStreamService.EditorSelectionChangedNotificationAsync(
							virtualTextDocument.Uri,
							activeEditorState,
							wpfTextView.ToVisibleRangesSafe(),
							wpfTextView?.TextSnapshot?.LineCount,
							CodemarkType.Comment, CancellationToken.None);
					}
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(OnTextSelectionChangedSubjectHandlerAsync));
			}
		}

		private async System.Threading.Tasks.Task OnCaretPositionChangedSubjectHandlerAsync(CaretPositionChangedSubject e) {
			try {
				using (var metrics = Log.WithMetrics(nameof(OnCaretPositionChangedSubjectHandlerAsync))) {
					if (e == null || e.EventArgs == null) return;

					var wpfTextView = e.WpfTextView;
					if (wpfTextView == null || !SessionService.IsReady || !SessionService.IsWebViewVisible || !SessionService.IsCodemarksForFileVisible) return;
					if (!wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out IVirtualTextDocument virtualTextDocument)) return;
					if (virtualTextDocument == null) return;

					Debug.WriteLine($"{nameof(OnCaretPositionChangedSubjectHandlerAsync)} new={e.EventArgs.NewPosition} old={e.EventArgs.OldPosition}");

					var cursorLine = wpfTextView.TextSnapshot.GetLineFromPosition(e.EventArgs.NewPosition.BufferPosition.Position);
					_ = CodeStreamService.ChangeCaretAsync(virtualTextDocument.Uri, wpfTextView.ToVisibleRangesSafe(), cursorLine.LineNumber, wpfTextView.TextSnapshot.LineCount);
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(OnCaretPositionChangedSubjectHandlerAsync));
			}
		}

		private async System.Threading.Tasks.Task OnVisibleRangesSubjectHandlerAsync(Uri uri, IWpfTextView wpfTextView) {
			try {
				if (wpfTextView.InLayout || wpfTextView.IsClosed || SessionService.WebViewDidInitialize != true) return;

				_ = CodeStreamService.BrowserService?.NotifyAsync(
					new HostDidChangeEditorVisibleRangesNotificationType {
						Params = new HostDidChangeEditorVisibleRangesNotification(
							uri,
							EditorService.GetEditorState(wpfTextView)?.ToEditorSelectionsSafe(),
							wpfTextView.ToVisibleRangesSafe(),
							wpfTextView.TextSnapshot?.LineCount
						)
					});
			}
			catch (InvalidOperationException ex) {
				Log.Warning(ex, nameof(OnVisibleRangesSubjectHandlerAsync));
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(OnVisibleRangesSubjectHandlerAsync));
			}
			await System.Threading.Tasks.Task.CompletedTask;
		}

		private async System.Threading.Tasks.Task OnTextViewLayoutChangedSubjectHandlerAsync(TextViewLayoutChangedSubject subject) {
			try {
				bool canTrigger = false;
				IWpfTextView wpfTextView;
				IVirtualTextDocument virtualTextDocument;
				using (var metrics = Log.WithMetrics(nameof(OnTextViewLayoutChangedSubjectHandlerAsync))) {
					Debug.WriteLine($"{nameof(OnTextViewLayoutChangedSubjectHandlerAsync)} RequiresMarkerCheck={subject.RequiresMarkerCheck} TriggerTextViewLayoutChanged={subject.TriggerTextViewLayoutChanged}");
					wpfTextView = subject.WpfTextView;

					if (wpfTextView.Properties.TryGetProperty(PropertyNames.TextViewDocument, out virtualTextDocument)) {
						// don't trigger for changes that don't result in lines being added or removed

						if (wpfTextView.Properties.TryGetProperty(PropertyNames.DocumentMarkerManager, out DocumentMarkerManager documentMarkerManager) && documentMarkerManager != null) {
							// get markers if it's null (first time) or we did something that isn't scrolling/vertical changes
							if (subject.RequiresMarkerCheck) {
								var updated = await documentMarkerManager.TrySetMarkersAsync();
								if (updated) {
									subject.TriggerTextViewLayoutChanged = true;
								}
							}
						}
						if (subject.TriggerTextViewLayoutChanged) {
							//only send this if we have an actual change						
							try {
								if (wpfTextView.InLayout || wpfTextView.IsClosed) return;

								_ = OnVisibleRangesSubjectHandlerAsync(virtualTextDocument.Uri, wpfTextView);
								canTrigger = true;
							}
							catch (InvalidOperationException ex) {
								Log.Warning(ex, nameof(OnTextViewLayoutChangedSubjectHandlerAsync));
							}
							catch (Exception ex) {
								Log.Error(ex, nameof(OnTextViewLayoutChangedSubjectHandlerAsync));
							}
						}
					}
				}
				if (canTrigger && wpfTextView != null && virtualTextDocument?.SupportsMargins == true) {
					_ = TriggerMarginOnTextViewLayoutChangedAsync(subject, wpfTextView);
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(OnTextViewLayoutChanged));
			}

			await System.Threading.Tasks.Task.CompletedTask;
		}

		private async System.Threading.Tasks.Task TriggerMarginOnTextViewLayoutChangedAsync(TextViewLayoutChangedSubject subject, IWpfTextView wpfTextView) {
			try {
				using (var metrics = Log.WithMetrics(nameof(TriggerMarginOnTextViewLayoutChangedAsync))) {
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
					wpfTextView
						.Properties
						.GetProperty<List<ICodeStreamWpfTextViewMargin>>(PropertyNames.TextViewMarginProviders)
						.OnTextViewLayoutChanged(subject.Sender, subject.EventArgs);
				}
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(TriggerMarginOnTextViewLayoutChangedAsync));
			}

			await System.Threading.Tasks.Task.CompletedTask;
		}


		#endregion

		#region Models

		class TextViewState {
			public bool Initialized { get; set; }
		}

		internal class TextViewLayoutChangedSubject {
			public TextViewLayoutChangedSubject(IWpfTextView wpfTextView, object sender,
				TextViewLayoutChangedEventArgs e) {
				WpfTextView = wpfTextView;
				Sender = sender;
				EventArgs = e;
			}

			public IWpfTextView WpfTextView { get; }
			public object Sender { get; }
			public TextViewLayoutChangedEventArgs EventArgs { get; }
			public bool RequiresMarkerCheck { get; set; }
			public bool TriggerTextViewLayoutChanged { get; set; }
		}

		internal class TextSelectionChangedSubject {
			public TextSelectionChangedSubject(IWpfTextView wpfTextView, ITextSelection textSelection) {
				WpfTextView = wpfTextView;
				TextSelection = textSelection;
			}

			public ITextSelection TextSelection { get; }

			public IWpfTextView WpfTextView { get; }
		}

		internal class CaretPositionChangedSubject {
			public CaretPositionChangedSubject(IWpfTextView wpfTextView, object sender, CaretPositionChangedEventArgs e) {
				WpfTextView = wpfTextView;
				Sender = sender;
				EventArgs = e;
			}

			public IWpfTextView WpfTextView { get; }
			public object Sender { get; }
			public CaretPositionChangedEventArgs EventArgs { get; }
		}

		#endregion
	}
}
