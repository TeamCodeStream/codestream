using System;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models
{
	public class ShowCodemarkNotification
	{
		public string CodemarkId { get; set; }
		public string SourceUri { get; set; }
	}

	public class ShowCodemarkNotificationType : NotificationType<ShowCodemarkNotification>
	{
		public const string MethodName = "webview/codemark/show";
		public override string Method => MethodName;
	}

	public class ShowStreamNotification
	{
		public string StreamId { get; set; }
		public string ThreadId { get; set; }
		public string CodemarkId { get; set; }
	}

	public class ShowStreamNotificationType : NotificationType<ShowStreamNotification>
	{
		public const string MethodName = "webview/stream/show";
		public override string Method => MethodName;
	}

	public class NewCodemarkNotification
	{
		public NewCodemarkNotification(Uri uri, Range range, CodemarkType type, string source)
		{
			Uri = uri.ToString();
			Range = range;
			Type = type;
			Source = source;
		}

		public string Uri { get; }
		public Range Range { get; }
		public CodemarkType Type { get; }
		public string Source { get; }
	}

	public class NewCodemarkNotificationType : NotificationType<NewCodemarkNotification>
	{
		public const string MethodName = "webview/codemark/new";
		public override string Method => MethodName;
	}

	public class StartWorkNotification
	{
		public StartWorkNotification(string source, Uri uri = null)
		{
			Source = source;
			Uri = uri?.ToString();
		}

		public string Source { get; }
		public string Uri { get; }
	}

	public class StartWorkNotificationType : NotificationType<StartWorkNotification>
	{
		public const string MethodName = "webview/work/start";
		public override string Method => MethodName;
	}

	public class NewReviewNotification
	{
		public NewReviewNotification(Uri uri, string source)
		{
			Uri = uri?.ToString();
			Source = source;
		}

		public string Uri { get; }
		public string Source { get; }
	}

	public class NewReviewNotificationType : NotificationType<NewReviewNotification>
	{
		public const string MethodName = "webview/review/new";
		public override string Method => MethodName;
	}

	public class ShowNextChangedFileNotification { }

	public class ShowNextChangedFileNotificationType
		: NotificationType<ShowNextChangedFileNotification>
	{
		public const string MethodName = "webview/showChangedFile/next";
		public override string Method => MethodName;
	}

	public class ShowPreviousChangedFileNotification { }

	public class ShowPreviousChangedFileNotificationType
		: NotificationType<ShowPreviousChangedFileNotification>
	{
		public const string MethodName = "webview/showChangedFile/previous";
		public override string Method => MethodName;
	}

	public class ConfigChangeReloadNotification { }

	public class ConfigChangeReloadNotificationType
		: NotificationType<ConfigChangeReloadNotification>
	{
		public const string MethodName = "codestream/configChangeReload";
		public override string Method => MethodName;
	}
}
