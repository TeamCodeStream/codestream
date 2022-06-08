using System;

namespace CodeStream.VisualStudio.Shared.Attributes {
	public class VisualStudioSettingAttribute : Attribute {
		public string Path { get; }

		public VisualStudioSettingAttribute(string path) {
			Path = path;
		}
	}
}
