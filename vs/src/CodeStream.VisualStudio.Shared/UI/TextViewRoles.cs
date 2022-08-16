using System.Collections.Generic;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Core {
	public static class TextViewRoles {
		/// <summary>
		/// Only get textViews that we care about
		/// </summary>
		public static readonly List<string> DefaultDocumentRoles = new List<string> {
			PredefinedTextViewRoles.Interactive,
			PredefinedTextViewRoles.Document,
			PredefinedTextViewRoles.PrimaryDocument,
			PredefinedTextViewRoles.Editable
		};

		public static readonly List<string> InvalidDocumentRoles = new List<string> {
			"LEFTDIFF"
		};

		public static readonly List<string> InvalidMarginRoles = new List<string> {
			"DIFF"
		};
	}
}
