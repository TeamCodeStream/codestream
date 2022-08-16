using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services {
	public interface ICodeStreamSettingsManager : IOptions {
		void SaveSettingsToStorage();
		Settings GetSettings();
		TraceLevel TraceLevel {  set; }
		IOptionsDialogPage DialogPage { get; }
		string GetEnvironmentName();
		string GetUsefulEnvironmentName();
		string GetEnvironmentVersionFormatted();
		Ide GetIdeInfo();
		Extension GetExtensionInfo();
		Proxy Proxy { get; }

		TraceLevel GetAgentTraceLevel();
		TraceLevel GetExtensionTraceLevel();
		/// <summary>
		/// Stop the propertyChanged notifications from happening
		/// </summary>
		void PauseNotifications();

		/// <summary>
		/// Resume the propertyChanged notifications
		/// </summary>
		void ResumeNotifications();

		void SetEnvironment(CodeStreamEnvironmentInfo environment);
		CodeStreamEnvironmentInfo GetCodeStreamEnvironmentInfo { get; }
	}
}
