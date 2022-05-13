namespace CodeStream.VisualStudio.Core.Models {
	public class ShellPromptFolderRequest {
		public string Message { get; set; }
	}

	public class ShellPromptFolderResponse {
		public string Path { get; set; }
	}

	public class ShellPromptFolderRequestType : RequestType<ShellPromptFolderRequest> {
		public const string MethodName = "host/shell/prompt/folder";
		public override string Method => MethodName;
	}
}
