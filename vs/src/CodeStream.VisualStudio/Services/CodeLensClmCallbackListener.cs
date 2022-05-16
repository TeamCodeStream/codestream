using System.ComponentModel.Composition;
using System.Diagnostics;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Services {

	[Export(typeof(ICodeLensCallbackListener))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	[ContentType("CSharp")]
	public class CodeLensClmCallbackListener : ICodeLensCallbackListener, ICodeLevelMetricsListener {
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;
		private readonly ISettingsServiceFactory _settingsServiceFactory;

		[ImportingConstructor]
		public CodeLensClmCallbackListener(
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService,
			ISettingsServiceFactory settingsServiceFactory) {
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;
			_settingsServiceFactory = settingsServiceFactory;
		}

		public bool IsClmReady() {
			var settings = _settingsServiceFactory.GetOrCreate(nameof(CodeLensClmCallbackListener));

			return settings.ShowGoldenSignalsInEditor && _sessionService.IsReady;
		}

		public int GetVisualStudioPid() => Process.GetCurrentProcess().Id;
	}
}
