using System.ComponentModel.Composition;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.Margins
{
    [Export(typeof(EditorOptionDefinition))]
    [Name(DocumentMarkScrollbarMarkersEnabledOption.MarkersEnabledName)]
    public sealed class DocumentMarkScrollbarMarkersEnabledOption : WpfViewOptionDefinition<bool>
    {
        public const string MarkersEnabledName = "DocumentMarkScrollbarMarkersEnabled";
        public static readonly EditorOptionKey<bool> OptionKey = new EditorOptionKey<bool>(DocumentMarkScrollbarMarkersEnabledOption.MarkersEnabledName);

        public override bool Default => true;

        public override EditorOptionKey<bool> Key => DocumentMarkScrollbarMarkersEnabledOption.OptionKey;
    }
}
