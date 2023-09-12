using System;

namespace CodeStream.VisualStudio.Core.Models
{
	[Flags]
	public enum SessionState
	{
		Unknown = 0,

		/// <summary>
		/// User is in the process of signing in
		/// </summary>
		UserSigningIn = 1 << 1,

		/// <summary>
		/// The user has authenticated
		/// </summary>
		UserSignedIn = 1 << 2,

		/// <summary>
		/// The user is signing out
		/// </summary>
		UserSigningOut = 1 << 3,

		/// <summary>
		/// The user has signed out
		/// </summary>
		UserSignedOut = 1 << 4,

		/// <summary>
		/// The user has failed signing in
		/// </summary>
		UserSignInFailed = 1 << 5
	}
}
