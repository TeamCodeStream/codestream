using CodeStream.VisualStudio.Core.Attributes;

namespace CodeStream.VisualStudio.Core.Enums
{
	public enum VisualStudioSetting
	{
		[VisualStudioSetting("TextEditorGlobalOptions.IsCodeLensEnabled")]
		IsCodeLensEnabled,

		[VisualStudioSetting("TextEditorGlobalOptions.CodeLensDisabledProviders")]
		CodeLensDisabledProviders
	}
}
