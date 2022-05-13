using System.ComponentModel.Composition;
using System.Diagnostics;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(ICodeLensCallbackListener))]
	[ContentType("CSharp")]
	public class CodeLensClmCallbackListener : ICodeLensCallbackListener, ICodeLevelMetricsListener {
		public int GetVisualStudioPid() => Process.GetCurrentProcess().Id;
	}
}
