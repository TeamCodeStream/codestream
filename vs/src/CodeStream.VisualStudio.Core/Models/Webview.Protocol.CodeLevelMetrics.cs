namespace CodeStream.VisualStudio.Core.Models {
	public class ViewMethodLevelTelemetryNotificationType : NotificationType<ViewMethodLevelTelemetryNotification> {
		public const string MethodName = "webview/mlt/view";
		public override string Method => MethodName;
	}

	public class ViewMethodLevelTelemetryNotification {
		public RepoInfo Repo { get; set; }
		public string FunctionName { get; set; }
		public string NewRelicEntityGuid { get; set; }
		public MetricTimesliceNameMapping MetricTimesliceNameMapping { get; set; }
	}
}
