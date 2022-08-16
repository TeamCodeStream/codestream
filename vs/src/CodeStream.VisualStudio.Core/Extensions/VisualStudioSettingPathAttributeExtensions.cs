using System;
using System.Linq;
using CodeStream.VisualStudio.Core.Attributes;
using CodeStream.VisualStudio.Core.Enums;

namespace CodeStream.VisualStudio.Core.Extensions {
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
