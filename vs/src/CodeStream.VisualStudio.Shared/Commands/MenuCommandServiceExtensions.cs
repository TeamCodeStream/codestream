using System.ComponentModel.Design;
using CodeStream.VisualStudio.Core.Extensions;

namespace CodeStream.VisualStudio.Shared.Commands
{
	/// <summary>
	/// Extension methods for <see cref="IMenuCommandService"/>.
	/// </summary>
	public static class MenuCommandServiceExtensions
	{
		/// <summary>
		/// Adds <see cref="IVsCommand"/>s or <see cref="IVsCommand{TParam}"/>s to a menu.
		/// </summary>
		/// <param name="service">The menu command service.</param>
		/// <param name="commands">The commands to add.</param>
		public static void AddCommands(
			this IMenuCommandService service,
			params IVsCommandBase[] commands
		)
		{
			Guard.ArgumentNotNull(service, nameof(service));
			Guard.ArgumentNotNull(commands, nameof(commands));

			foreach (var vsCommandBase in commands)
			{
				var command = vsCommandBase as MenuCommand;
				if (command != null)
				{
					service.AddCommand(command);
				}
			}
		}
	}
}
