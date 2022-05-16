namespace CodeStream.VisualStudio.Core.Models {
	public class RefreshEditorsCodeLensRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/editors/codelens/refresh";
		public override string Method => MethodName;
	}

	public class RefreshEditorsCodeLensResponse {
		public bool Success { get; set; }
	}
}
