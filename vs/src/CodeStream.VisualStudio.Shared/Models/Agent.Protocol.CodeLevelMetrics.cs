using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models
{
	public class GetFileLevelTelemetryRequestType : RequestType<GetFileLevelTelemetryRequest> {
		public const string MethodName = "codestream/newrelic/fileLevelTelemetry";
		public override string Method => MethodName;
	}

	public class GetFileLevelTelemetryRequest {
		[JsonProperty("fileUri", NullValueHandling = NullValueHandling.Ignore)]
		public string FileUri { get; set; }
		[JsonProperty("languageId", NullValueHandling = NullValueHandling.Ignore)]
		public string LanguageId { get; set; }
		[JsonProperty("resetCache", NullValueHandling = NullValueHandling.Ignore)]
		public bool ResetCache { get; set; }
		[JsonProperty("locator", NullValueHandling = NullValueHandling.Ignore)]
		public FileLevelTelemetryFunctionLocator Locator { get; set; }
		[JsonProperty("options", NullValueHandling = NullValueHandling.Ignore)]
		public FileLevelTelemetryRequestOptions Options { get; set; }
	}

	public class GetFileLevelTelemetryResponse {
		[JsonProperty("repo", NullValueHandling = NullValueHandling.Ignore)]
		public RepoInfo Repo { get; set; }
		[JsonProperty("isConnected", NullValueHandling = NullValueHandling.Ignore)]
		public bool IsConnected { get; set; }
		[JsonProperty("throughput", NullValueHandling = NullValueHandling.Ignore)]
		public IList<ThroughputResponse> Throughput { get; set; } = new List<ThroughputResponse>();
		[JsonProperty("averageDuration", NullValueHandling = NullValueHandling.Ignore)]
		public IList<AverageDurationResponse> AverageDuration { get; set; } = new List<AverageDurationResponse>();
		[JsonProperty("errorRate", NullValueHandling = NullValueHandling.Ignore)]
		public IList<ErrorRateResponse> ErrorRate { get; set; } = new List<ErrorRateResponse>();
		[JsonProperty("lastUpdateDate", NullValueHandling = NullValueHandling.Ignore)]
		public long? LastUpdateDate { get; set; }
		[JsonProperty("hasAnyData", NullValueHandling = NullValueHandling.Ignore)]
		public bool HasAnyData { get; set; }
		[JsonProperty("sinceDateFormatted", NullValueHandling = NullValueHandling.Ignore)]
		public string SinceDateFormatted { get; set; }
		[JsonProperty("newRelicAccountId", NullValueHandling = NullValueHandling.Ignore)]
		public long NewRelicAccountId { get; set; }
		[JsonProperty("newRelicEntityGuid", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicEntityGuid { get; set; }
		[JsonProperty("newRelicEntityName", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicEntityName { get; set; }
		[JsonProperty("newRelicUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicUrl { get; set; }
		[JsonProperty("newRelicEntityAccounts", NullValueHandling = NullValueHandling.Ignore)]
		public IList<EntityAccount> NewRelicEntityAccounts { get; set; } = new List<EntityAccount>();
		[JsonProperty("newRelicAlertSeverity", NullValueHandling = NullValueHandling.Ignore)]
		public string NewRelicAlertSeverity { get; set; }
		[JsonProperty("codeNamespace", NullValueHandling = NullValueHandling.Ignore)]
		public string CodeNamespace { get; set; }
		[JsonProperty("relativeFilePath", NullValueHandling = NullValueHandling.Ignore)]
		public string RelativeFilePath { get; set; }
		[JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
		public Error Error { get; set; }
	}
}
