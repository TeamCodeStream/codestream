using System.Windows.Controls;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	public partial class CodeLevelMetricsControl : UserControl
	{
		public CodeLevelMetricsControl(CodeLevelMetricsGlyph glyph)
		{
			DataContext = glyph;
			InitializeComponent();
		}
	}
}
