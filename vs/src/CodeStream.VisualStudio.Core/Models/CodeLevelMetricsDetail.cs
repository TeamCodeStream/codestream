namespace CodeStream.VisualStudio.Core.Models
{
	public class CodeLevelMetricsDetail {

		public CodeLevelMetricsDetail(int order, string header, string value)
		{
			Order = order;
			Header = header;
			Value = value;
		}

		public int Order { get; }
		public string Header { get; }
		public string Value { get; }
	}
}
