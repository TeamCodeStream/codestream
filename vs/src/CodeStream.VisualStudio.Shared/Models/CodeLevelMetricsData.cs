using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
	/// <summary>
	/// Model that represents the necessary data coming from the telemetry, plus our special detail
	/// model which represents which tokens to render (and in what order) for the XAML view.
	///</summary>
	/// <remarks>
	/// ViewModel - <seealso cref="CodeStream.VisualStudio.UI.CodeLevelMetricsDetails.ViewMore_OnMouseDown" />
	/// Rendering Factory - <seealso cref="CodeStream.VisualStudio.UI.CodeLevelMetricsDetailsViewFactory.CreateViewElement" />
	/// </remarks>
	public class CodeLevelMetricsData {
		public RepoInfo Repo { get; set; }
		public string FunctionName { get; set; }
		public IList<CodeLevelMetricsDetail> Details { get; set; } = new List<CodeLevelMetricsDetail>();
		public string NewRelicEntityGuid { get; set; }
		public MetricTimesliceNameMapping MetricTimeSliceNameMapping { get; set; }
	}
}
