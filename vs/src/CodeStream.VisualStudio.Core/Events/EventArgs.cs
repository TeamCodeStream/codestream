using System;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.LiveShare;

namespace CodeStream.VisualStudio.Core.Events {
	public class EventBase { }

	public sealed class LanguageServerReadyEvent : EventBase {
		public bool IsReady { get; set; }
	}

	public sealed class LanguageServerDisconnectedEvent : EventBase {
		public string Message { get; }
		public string Description { get; }
		public string Reason { get; }
		public Exception Exception { get; }
		public bool IsReloading { get; set; }

		public LanguageServerDisconnectedEvent(string message, string description, string reason, Exception exception) {
			Message = message;
			Description = description;
			Reason = reason;
			Exception = exception;
		}
	}

	public sealed class SessionReadyEvent : EventBase { }

	public sealed class SessionLogoutEvent : EventBase { }

	public sealed class SessionDidStartSignInEvent : EventBase { }

	public sealed class SessionDidStartSignOutEvent : EventBase { }

	public sealed class SessionDidFailSignInEvent : EventBase { }

	public sealed class WebviewDidInitializeEvent : EventBase { }

	public enum TextDocumentChangedReason {
		Unknown,
		Scrolled,
		Edited,
		ViewportHeightChanged
	}

	public sealed class TextDocumentChangedEvent : EventBase {
		public TextDocumentChangedReason Reason { get; set; }
	}

	public sealed class ConnectionStatusChangedEvent : EventBase {
		public bool? Reset { get; set; }

		public ConnectionStatus Status { get; set; }
	}

	public sealed class MarkerGlyphVisibilityEvent : EventBase {
		public bool IsVisible { get; set; }
	}

	public sealed class AutoHideMarkersEvent : EventBase {
		public bool Value { get; set; }
	}

	public sealed class LiveShareStartedEvent : EventBase {
		public CollaborationSession CollaborationSession { get; }
		public LiveShareStartedEvent(CollaborationSession collaborationSession) {
			CollaborationSession = collaborationSession;
		}
	}

	public sealed class DocumentMarkerChangedEvent : EventBase {
		public Uri Uri { get; set; }
	}

	public sealed class UserPreferencesChangedEvent : EventBase {
		public DidChangeUserPreferencesData Data { get; }
		public UserPreferencesChangedEvent(DidChangeUserPreferencesData data) {
			Data = data;
		}
	}
}
