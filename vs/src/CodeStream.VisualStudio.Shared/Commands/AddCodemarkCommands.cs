using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.Threading;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;

#if X86
	using CodeStream.VisualStudio.Vsix.x86;
#else
	using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands {
	internal class AddCodemarkCommentCommand : AddCodemarkCommandBase {
		public AddCodemarkCommentCommand(ISessionService sessionService, Guid commandSet) : base(sessionService, commandSet, PackageIds.AddCodemarkCommentCommandId) { }
		protected override CodemarkType CodemarkType => CodemarkType.Comment;
	}

	internal class AddCodemarkIssueCommand : AddCodemarkCommandBase {
		public AddCodemarkIssueCommand(ISessionService sessionService, Guid commandSet) : base(sessionService, commandSet, PackageIds.AddCodemarkIssueCommandId) { }
		protected override CodemarkType CodemarkType => CodemarkType.Issue;
	}

	internal class AddCodemarkPermalinkCommand : AddCodemarkCommandBase {
		public AddCodemarkPermalinkCommand(ISessionService sessionService, Guid commandSet) : base(sessionService, commandSet, PackageIds.AddCodemarkPermalinkCommandId) { }
		protected override CodemarkType CodemarkType => CodemarkType.Link;
	}

	internal class AddCodemarkPermalinkInstantCommand : AddCodemarkCommandBase {
		public AddCodemarkPermalinkInstantCommand(ISessionService sessionService, Guid commandSet) : base(sessionService, commandSet, PackageIds.AddCodemarkPermalinkInstantCommandId) { }

		private static readonly ILogger Log = LogManager.ForContext<AddCodemarkPermalinkInstantCommand>();
		protected override CodemarkType CodemarkType => CodemarkType.Link;

		protected override void ExecuteUntyped(object parameter) {
			try {
				var componentModel = (IComponentModel)Package.GetGlobalService(typeof(SComponentModel));
				var agentService = componentModel?.GetService<ICodeStreamAgentService>();
				if (agentService == null) return;
				
				var editorService = componentModel.GetService<IEditorService>();
				var activeTextEditor = editorService.GetActiveTextEditorSelection();
				if (activeTextEditor == null) return;

				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					try {
						var response = await agentService.CreatePermalinkAsync(activeTextEditor.Range, activeTextEditor.Uri.ToString(),
							"private");

						if (response != null) {
							var ideService = componentModel?.GetService<IIdeService>();
							if (ideService != null) {
								await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
								await ideService.SetClipboardAsync(response.LinkUrl);
							}
							//InfoBarProvider.Instance.ShowInfoBar($"Copied {foo.LinkUrl} to your clipboard");
						}
					}
					catch (Exception ex) {
						Log.Error(ex, nameof(ExecuteUntyped));
					}
				});
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(AddCodemarkPermalinkInstantCommand));
			}
		}
	}
}
