using System.ComponentModel.Composition;
using System.Windows.Media;
using Microsoft.VisualStudio.Text.Classification;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.Margins
{
	[Export(typeof(EditorFormatDefinition))]
	[Name(DocumentMarkScrollbarFormat.Name)]
	[UserVisible(true)]
	[Order(Before = Priority.Default)]
	internal sealed class DocumentMarkScrollbarFormat : EditorFormatDefinition
	{
		public const string Name = "DocumentMarkScrollbarColor";

		public DocumentMarkScrollbarFormat()
		{
			this.DisplayName = Name;
			this.ForegroundColor = Color.FromRgb(49, 147, 241);
		}
	}
}
