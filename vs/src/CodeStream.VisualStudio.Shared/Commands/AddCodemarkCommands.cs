using Microsoft.VisualStudio.Shell;

using System;

using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;

#if X86
using CodeStream.VisualStudio.Vsix.x86;
#else
using CodeStream.VisualStudio.Vsix.x64;
#endif

namespace CodeStream.VisualStudio.Shared.Commands
{
	internal class AddCodemarkCommentCommand : AddCodemarkCommandBase
	{
		public AddCodemarkCommentCommand(
			ISessionService sessionService,
			IIdeService ideService,
			ICodeStreamSettingsManager codeStreamSettingsManager,
			Guid commandSet
		)
			: base(
				sessionService,
				ideService,
				codeStreamSettingsManager,
				commandSet,
				PackageIds.AddCodemarkCommentCommandId
			) { }

		protected override CodemarkType CodemarkType => CodemarkType.Comment;

		protected override void OnBeforeQueryStatus(OleMenuCommand sender, EventArgs e)
		{
			base.OnBeforeQueryStatus(sender, e);

			sender.Visible = CodeStreamSettingsManager.ShowContextMenuCommands;
		}
	}

	internal class AddCodemarkIssueCommand : AddCodemarkCommandBase
	{
		public AddCodemarkIssueCommand(
			ISessionService sessionService,
			IIdeService ideService,
			ICodeStreamSettingsManager codeStreamSettingsManager,
			Guid commandSet
		)
			: base(
				sessionService,
				ideService,
				codeStreamSettingsManager,
				commandSet,
				PackageIds.AddCodemarkIssueCommandId
			) { }

		protected override CodemarkType CodemarkType => CodemarkType.Issue;

		protected override void OnBeforeQueryStatus(OleMenuCommand sender, EventArgs e)
		{
			base.OnBeforeQueryStatus(sender, e);

			sender.Visible =
				CodeStreamSettingsManager.ShowContextMenuCommands
				&& sender.Visible
				&& IdeService.GetActiveDiffEditor() == null;
		}
	}
}
