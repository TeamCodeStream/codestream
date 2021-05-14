using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System;

namespace CodeStream.VisualStudio.Core.Services {
	public interface ISessionService {
		User User { get; }
		JToken State { get; }
		string TeamId { get; set; }
		void SetState(SessionState state);
		SessionState SessionState { get; }
		void SetUser(User user, JToken state);
		void SetAgentConnected();
		void SetAgentDisconnected();
		List<string> PanelStack { get; set; }
		/// <summary>
		/// Also known as Spatial view
		/// </summary>
		bool IsCodemarksForFileVisible { get; set; }
		bool IsWebViewVisible { get; set; }
		bool AreMarkerGlyphsVisible { get; set; }
		Uri LastActiveFileUri { get; set; }

		/// <summary>
		/// Session is ready when the agent has loaded and the user has logged in
		/// </summary>
		bool IsReady { get; }
		bool IsAgentReady { get; }
		void Logout(SessionSignedOutReason reason);		
		string StateString { get; }
		bool? WebViewDidInitialize { get; set; }
		/// <summary>
		/// Name of the current solution (.sln) file OR open folder
		/// </summary>
		string SolutionName { get; set; }
		ProjectType? ProjectType { get; set; }
	}
}
