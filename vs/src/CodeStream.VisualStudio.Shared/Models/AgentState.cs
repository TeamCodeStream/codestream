using System;

namespace CodeStream.VisualStudio.Shared.Models
{
	[Flags]
	public enum AgentState
	{
		Unknown = 0,

		/// <summary>
		/// The LanguageServerProcess is ready
		/// </summary>
		Ready = 1 << 1,

		/// <summary>
		/// The LanguageServerProcess is disconnected
		/// </summary>
		Disconnected = 1 << 2
	}
}
