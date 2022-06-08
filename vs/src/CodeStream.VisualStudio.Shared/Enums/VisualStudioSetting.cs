using CodeStream.VisualStudio.Shared.Attributes;

namespace CodeStream.VisualStudio.Shared.Enums {
	public enum VisualStudioSetting {
		[VisualStudioSetting("TextEditorGlobalOptions.IsCodeLensEnabled")]
		IsCodeLensEnabled,

		[VisualStudioSetting("TextEditorGlobalOptions.CodeLensDisabledProviders")]
		CodeLensDisabledProviders
	}
}
