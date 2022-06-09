using System;
using System.Collections.Generic;

namespace CodeStream.VisualStudio.Core.Models {
	public class HostDidChangeActiveEditorNotificationEditor {
		public HostDidChangeActiveEditorNotificationEditor(string fileName, Uri uri, List<EditorSelection> selections, List<Range> visibleRanges, int? lineCount) {
			FileName = fileName;
			Uri = uri.ToString();
			Selections = selections;
			VisibleRanges = visibleRanges;
			LineCount = lineCount;
		}

		public string FileName { get; }
		public string Uri { get; }
		public List<EditorSelection> Selections { get; }
		public List<Range> VisibleRanges { get; }
		public int? LineCount { get; }

		public string LanguageId { get; set; }
		public EditorMetrics Metrics { get; set; }
	}
	
	public class HostDidChangeActiveEditorNotificationBase {}

	public class HostDidChangeActiveEditorNotification : HostDidChangeActiveEditorNotificationBase {
		public HostDidChangeActiveEditorNotificationEditor Editor { get; set; }
	}

	public class HostDidChangeActiveEditorNotificationType : NotificationType<HostDidChangeActiveEditorNotificationBase> {
		public const string MethodName = "webview/editor/didChangeActive";
		public override string Method => MethodName;
	}

	public class HostDidChangeConfigNotification {
		public bool? ShowHeadshots { get; set; }
		public bool? ShowMarkerGlyphs { get; set; }
		public bool Debug { get; set; }
		public string Email { get; set; }
		public string ServerUrl { get; set; }
		public bool ShowGoldenSignalsInEditor { get; set; }
	}

	public class HostDidChangeConfigNotificationType : NotificationType<HostDidChangeConfigNotification> {
		public const string MethodName = "webview/config/didChange";
		public override string Method => MethodName;
	}

	public class HostDidChangeEditorSelectionNotification {
		public HostDidChangeEditorSelectionNotification(Uri uri, List<EditorSelection> selections, List<Range> visibleRanges, int? lineCount) {
			Uri = uri.ToString();
			Selections = selections;
			VisibleRanges = visibleRanges;
			LineCount = lineCount;
		}

		public string Uri { get; }
		public List<EditorSelection> Selections { get; }
		public List<Range> VisibleRanges { get; }
		public int? LineCount { get; }
	}

	public class HostDidChangeEditorSelectionNotificationType : NotificationType<HostDidChangeEditorSelectionNotification> {
		public const string MethodName = "webview/editor/didChangeSelection";
		public override string Method => MethodName;
	}

	public class HostDidChangeEditorVisibleRangesNotification {
		public HostDidChangeEditorVisibleRangesNotification(Uri uri, List<EditorSelection> selections, List<Range> visibleRanges, int? lineCount) {
			Uri = uri.ToString();
			Selections = selections;
			VisibleRanges = visibleRanges;
			LineCount = lineCount;
		}

		public string Uri { get; }
		public List<EditorSelection> Selections { get; }
		public List<Range> VisibleRanges { get; }
		public int? LineCount { get; }
	}

	public class HostDidChangeEditorVisibleRangesNotificationType : NotificationType<HostDidChangeEditorVisibleRangesNotification> {
		public const string MethodName = "webview/editor/didChangeVisibleRanges";
		public override string Method => MethodName;
	}

	public class HostDidChangeFocusNotification {
		/// <summary>
		/// Is the IDE focused?
		/// </summary>
		public bool Focused { get; set; }
	}

	public class HostDidChangeFocusNotificationType : NotificationType<HostDidChangeFocusNotification> {
		public const string MethodName = "webview/focus/didChange";
		public override string Method => MethodName;
	}

	public class HostDidLogoutNotification { }
	public class HostDidLogoutNotificationType : NotificationType<HostDidLogoutNotification> {
		public const string MethodName = "webview/didLogout";
		public override string Method => MethodName;
	}

	public class HostDidReceiveRequestNotification {
		public string Url { get; set; }
	}

	public class HostDidReceiveRequestNotificationType : NotificationType<HostDidReceiveRequestNotification> {
		public const string MethodName = "webview/request/parse";
		public override string Method => MethodName;
	}

}
