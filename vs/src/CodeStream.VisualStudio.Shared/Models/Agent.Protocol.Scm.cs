using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
	public class GetRangeScmInfoRequest {
		public string Uri { get; set; }
		public Range Range { get; set; }
		public bool Dirty { get; set; }
		public string Contents { get; set; }
	}

	public class Author {
		public string Id { get; set; }
		public string Username { get; set; }
	}

	public class Remote {
		public string Name { get; set; }
		public string Url { get; set; }
	}

	public class Scm {
		public string File { get; set; }
		public string RepoPath { get; set; }
		public string Revision { get; set; }
		public List<Author> Authors { get; set; }
		public List<Remote> Remotes { get; set; }
	}

	public class GetRangeScmInfoResponse {
		public string Uri { get; set; }
		public Range Range { get; set; }
		public string Contents { get; set; }
		public Scm Scm { get; set; }
		public string Error { get; set; }
	}

	public class GetRangeScmInfoRequestType : RequestType<GetRangeScmInfoRequest> {
		public static string MethodName = "codestream/scm/range/info";
		public override string Method => MethodName;
	}

}
