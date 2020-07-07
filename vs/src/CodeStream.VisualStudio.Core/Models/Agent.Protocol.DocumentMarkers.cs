namespace CodeStream.VisualStudio.Core.Models {
	public class CreateDocumentMarkerPermalinkRequest {
		public Range Range { get; set; }
		public string Uri { get; set; }
		public string Privacy { get; set; }
	}

	public class CreateDocumentMarkerPermalinkResponse {
		public string LinkUrl { get; set; }
	}

	public class CreateDocumentMarkerPermalinkRequestType : RequestType<CreateDocumentMarkerPermalinkRequest> {
		public const string MethodName = "codestream/textDocument/markers/create/link";
		public override string Method => MethodName;
	}
}
