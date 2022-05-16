using System;

namespace CodeStream.VisualStudio.Shared {
	public interface IRemoteVisualStudio {
		void RegisterCodeLensDataPoint(Guid codeLensId);
	}
}
