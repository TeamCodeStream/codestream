using System.Collections;
using System.Collections.Generic;

using CodeStream.VisualStudio.Core.Models;

using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models {
	
	public class PullRequestShowDiffRequestType : RequestType<PullRequestShowDiffRequest> {
		public const string MethodName = "host/files/compare";
		public override string Method => MethodName;
	}

	public class PullRequestShowDiffRequest
	{
		[JsonProperty("baseBranch", NullValueHandling = NullValueHandling.Ignore)]
		public string BaseBranch { get; set; }

		[JsonProperty("baseSha", NullValueHandling = NullValueHandling.Ignore)]
		public string BaseSha { get; set; }

		[JsonProperty("headBranch", NullValueHandling = NullValueHandling.Ignore)]
		public string HeadBranch { get; set; }

		[JsonProperty("headSha", NullValueHandling = NullValueHandling.Ignore)]
		public string HeadSha { get; set; }

		[JsonProperty("filePath", NullValueHandling = NullValueHandling.Ignore)]
		public string FilePath { get; set; }

		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; set; }

		[JsonProperty("context", NullValueHandling = NullValueHandling.Ignore)]
		public PullRequestContext Context { get; set; }
	}

	public class PullRequestContext
	{
		[JsonProperty("pullRequest", NullValueHandling = NullValueHandling.Ignore)]
		public PullRequest PullRequest { get; set; }
	}

	public class PullRequest
	{
		[JsonProperty("providerId", NullValueHandling = NullValueHandling.Ignore)]
		public string ProviderId { get; set; }

		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }

		[JsonProperty("collaborators", NullValueHandling = NullValueHandling.Ignore)]
		public IList<PullRequestCollaborator> Collaborators { get; set; }
	}

	public class PullRequestCollaborator
	{
		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }

		[JsonProperty("username", NullValueHandling = NullValueHandling.Ignore)]
		public string Username { get; set; }

		[JsonProperty("avatar", NullValueHandling = NullValueHandling.Ignore)]
		public PullRequestCollaboratorAvatar Avatar { get; set; }
	}

	public class PullRequestCollaboratorAvatar
	{
		[JsonProperty("image", NullValueHandling = NullValueHandling.Ignore)]
		public string Image { get; set; }
	}

	public class ReviewShowLocalDiffRequest {
		public string RepoId { get; set; }
		public string Path { get; set; }
		public bool? IncludeSaved { get; set; }
		public bool? IncludeStaged { get; set; }
		public string EditingReviewId { get; set; }
		public string BaseSha { get; set; }
	}

	public class ReviewShowLocalDiffRequestType : RequestType<ReviewShowLocalDiffRequest> {
		public const string MethodName = "host/review/showLocalDiff";
		public override string Method => MethodName;
	}

	public class ReviewShowDiffRequest {
		public string ReviewId { get; set; }
		public int? Checkpoint { get; set; }
		public string RepoId { get; set; }
		public string Path { get; set; }
	}

	public class ReviewShowDiffRequestType : RequestType<ReviewShowDiffRequest> {
		public const string MethodName = "host/review/showDiff";
		public override string Method => MethodName;
	}

	public class ReviewCloseDiffRequest { }
	public class ReviewCloseDiffRequestType : RequestType<ReviewCloseDiffRequest> {
		public const string MethodName = "host/review/closeDiff";
		public override string Method => MethodName;
	}

	public class ShowPreviousChangedFileRequest { }

	public class ShowPreviousChangedFileRequestType : RequestType<ShowPreviousChangedFileRequest> {
		public const string MethodName = "host/review/changedFiles/previous";
		public override string Method => MethodName;
	}

	public class ShowNextChangedFileRequest { }

	public class ShowNextChangedFileRequestType : RequestType<ShowNextChangedFileRequest> {
		public const string MethodName = "host/review/changedFiles/next";
		public override string Method => MethodName;
	}
}
