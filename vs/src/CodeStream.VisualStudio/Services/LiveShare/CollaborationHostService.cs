using Microsoft.VisualStudio.LiveShare;
using Microsoft.VisualStudio.Shell;
using System;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Services;
using Microsoft.VisualStudio.ComponentModelHost;

namespace CodeStream.VisualStudio.Services.LiveShare {
	/// <summary>
	/// Just a marker interface
	/// </summary>
	public interface ICollaborationHostService {}

	public class CollaborationHostService : ICollaborationHostService, ICollaborationService, IDisposable {
		public CollaborationHostService(CollaborationSession collaborationSession, IEventAggregator eventAggregator) {
			eventAggregator.Publish(new LiveShareStartedEvent(collaborationSession));
		}

		private bool _disposed = false;

		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing) {
			if (_disposed)
				return;

			_disposed = true;
		}
	}
}
