using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Packages;
using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Imaging.Interop;
using Microsoft.VisualStudio.Language.Intellisense;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Serilog;

namespace CodeStream.VisualStudio.Shared.UI.SuggestedActions {
	internal class CodemarkSuggestedActionsSource : ISuggestedActionsSource {
		private static readonly ILogger Log = LogManager.ForContext<CodemarkSuggestedActionsSource>();

		private readonly IComponentModel _componentModel;
		private readonly ITextBuffer _textBuffer;
		private readonly ITextView _textView;
		private readonly IVirtualTextDocument _virtualTextDocument;

		private readonly object _currentLock = new object();
		private IEnumerable<SuggestedActionSet> _current;
		private SnapshotSpan _currentSpan;
		private ISessionService _sessionService;

		public CodemarkSuggestedActionsSource(IComponentModel componentModel,
			ITextView textView,
			ITextBuffer textBuffer,
			IVirtualTextDocument virtualTextDocument) {
			_componentModel = componentModel;
			_textBuffer = textBuffer;
			_textView = textView;
			_virtualTextDocument = virtualTextDocument;
			_sessionService = _componentModel.GetService<ISessionService>();
		}

		public bool TryGetTelemetryId(out Guid telemetryId) {
			telemetryId = Guid.Empty;
			return false;
		}

#pragma warning disable 0067
		public event EventHandler<EventArgs> SuggestedActionsChanged;
#pragma warning restore 0067

		public IEnumerable<SuggestedActionSet> GetSuggestedActions(ISuggestedActionCategorySet requestedActionCategories, SnapshotSpan range, CancellationToken cancellationToken) {
			lock (_currentLock) {
				if (_currentSpan == range) {
					if (_sessionService == null || _sessionService.IsReady == false) return Enumerable.Empty<SuggestedActionSet>();
					return _current;
				}
			}
			return null;
		}

		public async Task<bool> HasSuggestedActionsAsync(ISuggestedActionCategorySet requestedActionCategories, SnapshotSpan range, CancellationToken cancellationToken) {
			await System.Threading.Tasks.Task.Yield();

			if (_sessionService == null || _sessionService.IsReady == false) return false;

			var wpfTextView = _textView as IWpfTextView;
			if (wpfTextView == null) return false;

			System.Diagnostics.Debug.WriteLine($"HasSuggestedActions HasEditorSelection={!range.IsEmpty}");

			cancellationToken.ThrowIfCancellationRequested();
			var suggestions = GetSuggestedActionsCore(wpfTextView);
			if (!suggestions.Any()) {
				return false;
			}
			lock (_currentLock) {
				cancellationToken.ThrowIfCancellationRequested();
				_current = suggestions;
				_currentSpan = range;
			}
			return true;
		}

		private IEnumerable<SuggestedActionSet> GetSuggestedActionsCore(IWpfTextView wpfTextView) {
			try {
				if (wpfTextView == null) return Enumerable.Empty<SuggestedActionSet>();


				System.Diagnostics.Debug.WriteLine($"GetSuggestedActions");
				return new[] {
					new SuggestedActionSet(
						actions: new ISuggestedAction[] {
							new CodemarkCommentSuggestedAction(_componentModel, wpfTextView, _virtualTextDocument),
							new CodemarkIssueSuggestedAction(_componentModel, wpfTextView, _virtualTextDocument),
							new CodemarkPermalinkSuggestedAction(_componentModel, wpfTextView, _virtualTextDocument)
						},
						categoryName: null,
						title: null,
						priority: SuggestedActionSetPriority.None,
						applicableToSpan: null
					)
				};
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(GetSuggestedActionsCore));
			}

			return Enumerable.Empty<SuggestedActionSet>();
		}


		public void Dispose() {
			Log.Verbose($"{nameof(CodemarkSuggestedActionsSource)} disposed");
		}
	}

	internal class CodemarkCommentSuggestedAction : CodemarkSuggestedActionBase {
		public CodemarkCommentSuggestedAction(IComponentModel componentModel, IWpfTextView wpfTextView, IVirtualTextDocument textDocument) : base(componentModel, wpfTextView, textDocument) { }
		protected override CodemarkType CodemarkType => CodemarkType.Comment;
		public override string DisplayText { get; } = $"Add Comment";
	}

	internal class CodemarkIssueSuggestedAction : CodemarkSuggestedActionBase {
		public CodemarkIssueSuggestedAction(IComponentModel componentModel, IWpfTextView wpfTextView, IVirtualTextDocument textDocument) : base(componentModel, wpfTextView, textDocument) { }
		protected override CodemarkType CodemarkType => CodemarkType.Issue;
		public override string DisplayText { get; } = $"Create Issue";
	}

	internal class CodemarkPermalinkSuggestedAction : CodemarkSuggestedActionBase {
		public CodemarkPermalinkSuggestedAction(IComponentModel componentModel, IWpfTextView wpfTextView, IVirtualTextDocument textDocument) : base(componentModel, wpfTextView, textDocument) { }
		protected override CodemarkType CodemarkType => CodemarkType.Link;
		public override string DisplayText { get; } = $"Get Permalink";
	}

	internal abstract class CodemarkSuggestedActionBase : ISuggestedAction {
		private static readonly ILogger Log = LogManager.ForContext<CodemarkSuggestedActionBase>();

		private readonly IWpfTextView _wpfTextView;
		private readonly IVirtualTextDocument _virtualTextDocument;
		protected IComponentModel ComponentModel { get; private set; }
		protected abstract CodemarkType CodemarkType { get; }

		protected CodemarkSuggestedActionBase(IComponentModel componentModel, IWpfTextView wpfTextView, IVirtualTextDocument virtualTextDocument) {
			ComponentModel = componentModel;
			_wpfTextView = wpfTextView;
			_virtualTextDocument = virtualTextDocument;
		}

		public Task<IEnumerable<SuggestedActionSet>> GetActionSetsAsync(CancellationToken cancellationToken) {
			return System.Threading.Tasks.Task.FromResult<IEnumerable<SuggestedActionSet>>(null);
		}

		public void Invoke(CancellationToken cancellationToken) {
			if (_virtualTextDocument == null) return;

			var codeStreamService = ComponentModel?.GetService<ICodeStreamService>();
			if (codeStreamService == null) return;

			ThreadHelper.JoinableTaskFactory.Run(async delegate {
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

				try {
					var toolWindowProvider = Package.GetGlobalService(typeof(SToolWindowProvider)) as IToolWindowProvider;
					if (!toolWindowProvider.IsVisible(Guids.WebViewToolWindowGuid)) {
						if (toolWindowProvider?.ShowToolWindowSafe(Guids.WebViewToolWindowGuid) == true) {
						}
						else {
							Log.Warning("Could not activate tool window");
						}
					}
					var sessionService = ComponentModel.GetService<ISessionService>();
					if (sessionService.WebViewDidInitialize == true) {
						var editorState = _wpfTextView.GetEditorState();
						_ = codeStreamService.NewCodemarkAsync(_virtualTextDocument.Uri, editorState?.Range, CodemarkType, "Lightbulb Menu", cancellationToken: cancellationToken);
					}
					else {
						var eventAggregator = ComponentModel.GetService<IEventAggregator>();
						IDisposable d = null;
						d = eventAggregator.GetEvent<WebviewDidInitializeEvent>().Subscribe(e => {
							try {
								var editorState = _wpfTextView.GetEditorState();
								_ = codeStreamService.NewCodemarkAsync(_virtualTextDocument.Uri, editorState?.Range, CodemarkType, "Lightbulb Menu", cancellationToken: cancellationToken); d.Dispose();
							}
							catch (Exception ex) {
								Log.Error(ex, $"{nameof(CodemarkSuggestedActionBase)} event");
							}
						});
					}
				}
				catch (Exception ex) {
					Log.Error(ex, nameof(CodemarkSuggestedActionBase));
				}
			});
		}

		public Task<object> GetPreviewAsync(CancellationToken cancellationToken) {
			// nothing here, but here is an example:

			//var textBlock = new TextBlock
			//{
			//    Padding = new Thickness(5)
			//};
			//textBlock.Inlines.Add(new Run() { Text = _selectedText.Text });

			return System.Threading.Tasks.Task.FromResult<object>(null);
		}

		public bool TryGetTelemetryId(out Guid telemetryId) {
			// This is a sample action and doesn't participate in LightBulb telemetry  
			telemetryId = Guid.Empty;
			return false;
		}

		public bool HasActionSets => false;

		public abstract string DisplayText { get; }

		public ImageMoniker IconMoniker => default(ImageMoniker);

		public string IconAutomationText => null;

		public string InputGestureText => null;

		public bool HasPreview => false;

		public void Dispose() {
		}
	}
}
