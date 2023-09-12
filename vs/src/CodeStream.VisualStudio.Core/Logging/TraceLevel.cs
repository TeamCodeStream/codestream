namespace CodeStream.VisualStudio.Core.Logging
{
	public enum TraceLevel
	{
		Silent,
		Errors,

		/// <summary>
		/// Info doesn't exist in the Agent -- but does in the extension, map it to Verbose
		/// </summary>
		Info,

		/// <summary>
		/// Debug is the most "verbose"
		/// </summary>
		Debug,

		/// <summary>
		/// Verbose is the default level for the agent, and is 2nd "verbose"
		/// </summary>
		Verbose
	}
}
