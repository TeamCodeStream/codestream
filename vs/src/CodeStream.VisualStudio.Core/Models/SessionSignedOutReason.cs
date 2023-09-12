namespace CodeStream.VisualStudio.Core.Models
{
	public enum SessionSignedOutReason
	{
		Unknown,
		NetworkIssue,
		SignInFailure,
		UserSignedOutFromWebview,
		UserSignedOutFromExtension,
		UserWentOffline,
		ReAuthenticating,
		MaintenanceMode
	}
}
