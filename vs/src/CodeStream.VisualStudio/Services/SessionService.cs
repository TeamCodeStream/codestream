using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Newtonsoft.Json.Linq;
using Serilog;
using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(ISessionService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class SessionService : ISessionService, IDisposable {
		private static readonly ILogger Log = LogManager.ForContext<SessionService>();
		private AgentState _agentState;

		public User User { get; private set; }
		public JToken State { get; private set; }
		public string TeamId { get; set; }
		public SessionState SessionState { get; private set; }
		public List<string> PanelStack { get; set; }
		public bool IsWebViewVisible { get; set; }
		public bool AreMarkerGlyphsVisible { get; set; } = true;
		/// <summary>
		/// Also known as Spatial view
		/// </summary>
		public bool IsCodemarksForFileVisible { get; set; }
		public Uri LastActiveFileUri { get; set; }
		public bool? WebViewDidInitialize { get; set; }
		public ProjectType? ProjectType { get; set; }

		private bool _disposed = false;

		public SessionService() {
			// for breakpointing
		}

		public string StateString => SessionState.ToString();
		private static readonly object locker = new object();

		public void SetAgentConnected() {
			Log.Debug($"{nameof(SetState)}");
			if (_agentState != AgentState.Ready) {
				lock (locker) {
					if (_agentState != AgentState.Ready) {
						_agentState = AgentState.Ready;
					}
				}
			}
		}

		public void SetAgentDisconnected() {
			Log.Debug($"{nameof(SetAgentDisconnected)}");
			if (_agentState != AgentState.Disconnected) {
				lock (locker) {
					if (_agentState != AgentState.Disconnected) {
						_agentState = AgentState.Disconnected;
					}
				}
			}
		}

		public void SetState(SessionState sessionState) {
			lock (locker) {
				SessionState = sessionState;
			}
		}

		public void SetUser(User user, JToken state) {
			User = user;
			State = state;
		}

		public void Logout(SessionSignedOutReason reason) {
			User = null;
			State = null;
			TeamId = null;
			SetState(SessionState.UserSignedOut);
		}

		public bool IsAgentReady {
			get {
				return _agentState == AgentState.Ready;
			}
		}

		public bool IsReady => _agentState == AgentState.Ready && SessionState == SessionState.UserSignedIn;
		public string SolutionName { get; set; }

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed)
				return;

			if (disposing) {
				SessionState = SessionState.Unknown;
			}

			_disposed = true;
		}
	}


}
