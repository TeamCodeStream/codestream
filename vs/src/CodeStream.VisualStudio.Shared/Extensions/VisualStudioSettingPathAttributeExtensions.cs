using System;
using System.Linq;
using CodeStream.VisualStudio.Shared.Attributes;
using CodeStream.VisualStudio.Shared.Enums;

namespace CodeStream.VisualStudio.Shared.Extensions {
	public static class VisualStudioSettingPathAttributeExtensions {
		public static VisualStudioSettingAttribute GetAttribute(this VisualStudioSetting setting) {
			var name = Enum.GetName(typeof(VisualStudioSetting), setting);

			return setting
				.GetType()
				.GetField(name)
				.GetCustomAttributes(false)
				.OfType<VisualStudioSettingAttribute>()
				.SingleOrDefault();
		}
	}
}
