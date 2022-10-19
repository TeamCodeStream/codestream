using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Models;

using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models {
	public class GetFileContentsAtRevisionRequest
	{
		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }

		[JsonProperty("path", NullValueHandling = NullValueHandling.Ignore)]
		public string Path { get; set; }

		[JsonProperty("sha", NullValueHandling = NullValueHandling.Ignore)]
		public string Sha { get; set; }

		[JsonProperty("fetchAllRemotes", NullValueHandling = NullValueHandling.Ignore)]
		public bool FetchAllRemotes { get; set; }
	}

	public class GetFileContentsAtRevisionResponse
	{
		[JsonProperty("repoRoot", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoRoot { get; set; }

		[JsonProperty("content", NullValueHandling = NullValueHandling.Ignore)]
		public string Content { get; set; }

		[JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
		public string Error { get; set; }
	}

	public class GetFileContentsAtRevisionRequestType : RequestType<GetFileContentsAtRevisionRequest>
	{
		public const string MethodName = "codestream/scm/file/diff";
		public override string Method => MethodName;
	}


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
