using System;
using CodeStream.VisualStudio.Shared.Enums;
using Microsoft.VisualStudio.Settings;

namespace CodeStream.VisualStudio.Shared.Exceptions {
	public class VisualStudioSettingException : Exception {
		public VisualStudioSettingException(VisualStudioSetting setting, GetValueResult valueResult)
			: base($"Failed to get {setting}. Result was: {valueResult}") { }
	}
}
