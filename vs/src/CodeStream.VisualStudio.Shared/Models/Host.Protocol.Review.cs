using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Models {
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
