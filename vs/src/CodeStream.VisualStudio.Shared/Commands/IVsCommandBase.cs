using System.Windows.Input;

namespace CodeStream.VisualStudio.Shared.Commands
{
	/// <summary>
	/// Represents a Visual Studio command exposed as an <see cref="ICommand"/>.
	/// </summary>
	public interface IVsCommandBase : ICommand
	{
		/// <summary>
		/// Gets a value indicating whether the command is enabled.
		/// </summary>
		bool Enabled { get; }

		/// <summary>
		/// Gets a value indicating whether the command is visible.
		/// </summary>
		bool Visible { get; }
	}
}
