using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models
{
	public class ViewMethodLevelTelemetryNotificationType
		: NotificationType<ViewMethodLevelTelemetryNotification>
	{
		public const string MethodName = "webview/mlt/view";
		public override string Method => MethodName;
	}

	public class ViewMethodLevelTelemetryNotification
	{
		public RepoInfo Repo { get; set; }
		public string CodeNamespace { get; set; }
		public string FilePath { get; set; }
		public string RelativeFilePath { get; set; }
		public Range Range { get; set; }
		public string FunctionName { get; set; }
		public string NewRelicEntityGuid { get; set; }
		public long NewRelicAccountId { get; set; }
		public string LanguageId { get; set; }
		public MetricTimesliceNameMapping MetricTimesliceNameMapping { get; set; }
		public FileLevelTelemetryRequestOptions MethodLevelTelemetryRequestOptions { get; set; }
		public ObservabilityAnomaly Anomaly { get; set; }
	}
}
