using System;
using System.Collections.Generic;

namespace CodeStream.VisualStudio.Core.Models {
	public class RefreshEditorsCodeLensRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/editors/codelens/refresh";
		public override string Method => MethodName;
	}

	public class RefreshEditorsCodeLensResponse {
		public bool Success { get; set; }
	}


	public class GetFileLevelTelemetryRequestType : RequestType<GetFileLevelTelemetryRequest> {
		public const string MethodName = "codestream/newrelic/fileLevelTelemetry";
		public override string Method => MethodName;
	}

	public class GetFileLevelTelemetryRequest {
		public string FilePath { get; set; }
		public string LanguageId { get; set; }
		public bool ResetCache { get; set; }
		public FileLevelTelemetryFunctionLocator Locator { get; set; }
		public FileLevelTelemetryRequestOptions Options { get; set; }
	}

	public class FileLevelTelemetryFunctionLocator {
		public string Namespace { get; set; }
		public string FunctionName { get; set; }
	}

	public class FileLevelTelemetryRequestOptions {
		public bool IncludeThroughput { get; set; }
		public bool IncludeAverageDuration { get; set; }
		public bool IncludeErrorRate { get; set; }
	}

	public class GetFileLevelTelemetryResponse {
		public RepoInfo Repo { get; set; }
		public bool IsConnected { get; set; }
		public IList<ThroughputResponse> Throughput { get; set; } = new List<ThroughputResponse>();
		public IList<AverageDurationResponse> AverageDuration { get; set; } = new List<AverageDurationResponse>();
		public IList<ErrorRateResponse> ErrorRate { get; set; } = new List<ErrorRateResponse>();
		public long? LastUpdateDate { get; set; }
		public bool HasAnyData { get; set; }
		public string SinceDateFormatted { get; set; }
		public long NewRelicAccountId { get; set; }
		public string NewRelicEntityGuid { get; set; }
		public string NewRelicEntityName { get; set; }
		public string NewRelicUrl { get; set; }
		public IList<EntityAccount> NewRelicEntityAccounts { get; set; } = new List<EntityAccount>();
		public string NewRelicAlertSeverity { get; set; }
		public string CodeNamespace { get; set; }
		public string RelativeFilePath { get; set; }
		public Error Error { get; set; }
	}

	public class RepoInfo {
		public string Id { get; set; }
		public string Name { get; set; }
		public string Remote { get; set; }
	}

	public class ThroughputResponse {
		public string RequestsPerMinute { get; set; }
		public string Namespace { get; set; }
		public string ClassName { get; set; }
		public string FunctionName { get; set; }
		public string MetricTimesliceName { get; set; }
	}

	public class AverageDurationResponse {
		public string AverageDuration { get; set; }
		public string Namespace { get; set; }
		public string ClassName { get; set; }
		public string FunctionName { get; set; }
		public string MetricTimesliceName { get; set; }
	}

	public class ErrorRateResponse {
		public string ErrorsPerMinute { get; set; }
		public string Namespace { get; set; }
		public string ClassName { get; set; }
		public string FunctionName { get; set; }
		public string MetricTimesliceName { get; set; }
	}

	public class Error {
		public string Message { get; set; }
		public string Type { get; set; }
	}

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

	public class MetricTimesliceNameMapping {
		public string D { get; set; }
		public string T { get; set; }
		public string E { get; set; }
	}
	
	public class EntityAccount {
		public string AlertSeverity { get; set; }
		public long AccountId { get; set; }
		public string AccountName { get; set; }
		public string EntityGuid { get; set; }
		public string EntityName { get; set; }
		public IDictionary<string, string[]> Tags { get; set; } = new Dictionary<string, string[]>();
	} 
}
