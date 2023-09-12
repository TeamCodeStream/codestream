using System;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace CodeStream.VisualStudio.Shared.Commands
{
	/// <summary>
	/// Base class for <see cref="VsCommand"/> and <see cref="VsCommand{TParam}"/>.
	/// </summary>
	public abstract class VsCommandBase : OleMenuCommand, IVsCommandBase
	{
		private EventHandler _canExecuteChanged;

		/// <summary>
		/// Initializes a new instance of the <see cref="VsCommandBase"/> class.
		/// </summary>
		/// <param name="commandSet">The GUID of the group the command belongs to.</param>
		/// <param name="commandId">The numeric identifier of the command.</param>
		protected VsCommandBase(Guid commandSet, int commandId)
			: base(
				ExecHandler,
				delegate { },
				QueryStatusHandler,
				new CommandID(commandSet, commandId)
			)
		{
			CommandSet = commandSet;
			BeforeQueryStatus += OnBeforeQueryStatus;
		}

		protected VsCommandBase(EventHandler invokeHandler, CommandID id)
			: base(invokeHandler, id) { }

		protected Guid CommandSet { get; }

		private void OnBeforeQueryStatus(object sender, EventArgs e)
		{
			if (sender is OleMenuCommand myCommand)
			{
				OnBeforeQueryStatus(myCommand, e);
			}
		}

		protected virtual void OnBeforeQueryStatus(OleMenuCommand sender, EventArgs e) { }

		/// <inheritdoc/>
		public event EventHandler CanExecuteChanged
		{
			add => _canExecuteChanged += value;
			remove => _canExecuteChanged -= value;
		}

		/// <inheritdoc/>
		public bool CanExecute(object parameter)
		{
			QueryStatus();
			return Enabled && Visible;
		}

		/// <inheritdoc/>
		public void Execute(object parameter)
		{
			ExecuteUntyped(parameter);
		}

		/// <summary>
		/// When overridden in a derived class, executes the command after casting the passed
		/// parameter to the correct type.
		/// </summary>
		/// <param name="parameter">The parameter</param>
		protected abstract void ExecuteUntyped(object parameter);

		protected override void OnCommandChanged(EventArgs e)
		{
			base.OnCommandChanged(e);
			_canExecuteChanged?.Invoke(this, e);
		}

		protected virtual void QueryStatus() { }

		static void ExecHandler(object sender, EventArgs e)
		{
			var args = (OleMenuCmdEventArgs)e;
			var command = sender as VsCommandBase;
			command?.ExecuteUntyped(args.InValue);
		}

		static void QueryStatusHandler(object sender, EventArgs e)
		{
			var command = sender as VsCommandBase;
			command?.QueryStatus();
		}
	}
}
