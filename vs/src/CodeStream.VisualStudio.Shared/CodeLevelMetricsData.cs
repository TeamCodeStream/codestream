using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared {
	public class CodeLevelMetricsData {
		public RepoInfo Repo { get; set; }
		public string FunctionName { get; set; }
		public IList<CodeLevelMetricsDetail> Details { get; set; } = new List<CodeLevelMetricsDetail>();
		public string NewRelicEntityGuid { get; set; }
		public MetricTimesliceNameMapping MetricTimeSliceNameMapping { get; set; }
	}

	public class CodeLevelMetricsDetail {
		public int Order { get; set; }
		public string Header { get; set; }
		public string Value { get; set; }
	}
}
