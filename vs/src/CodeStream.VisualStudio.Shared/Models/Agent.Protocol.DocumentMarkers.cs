using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models {
	public class CreateDocumentMarkerPermalinkRequest {
		[JsonProperty("range", NullValueHandling = NullValueHandling.Ignore)]
		public Range Range { get; set; }
		[JsonProperty("uri", NullValueHandling = NullValueHandling.Ignore)]
		public string Uri { get; set; }
		[JsonProperty("privacy", NullValueHandling = NullValueHandling.Ignore)]
		public string Privacy { get; set; }
	}

	public class CreateDocumentMarkerPermalinkResponse {
		[JsonProperty("linkUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string LinkUrl { get; set; }
	}

	public class CreateDocumentMarkerPermalinkRequestType : RequestType<CreateDocumentMarkerPermalinkRequest> {
		public const string MethodName = "codestream/textDocument/markers/create/link";
		public override string Method => MethodName;
	}
}
