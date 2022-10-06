using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

using CodeStream.VisualStudio.Core.Extensions;

using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class PullRequestDiffUri
	{
		private static readonly Regex Regex = new Regex(@"codestream-diff[:\\/\\/]-0-[\\/](?<payload>.+)[\\/]-0-[\\/](?<filePath>.+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

		[JsonIgnore]
		public Uri Uri { get; set; }

		[JsonProperty("path", NullValueHandling = NullValueHandling.Ignore)]
		public string Path { get; }

		[JsonProperty("repoId", NullValueHandling = NullValueHandling.Ignore)]
		public string RepoId { get; }

		[JsonProperty("baseBranch", NullValueHandling = NullValueHandling.Ignore)]
		public string BaseBranch { get; }

		[JsonProperty("headBranch", NullValueHandling = NullValueHandling.Ignore)]
		public string HeadBranch { get; }

		[JsonProperty("leftSha", NullValueHandling = NullValueHandling.Ignore)]
		public string LeftSha { get; }

		[JsonProperty("rightSha", NullValueHandling = NullValueHandling.Ignore)]
		public string RightSha { get; }

		[JsonProperty("side", NullValueHandling = NullValueHandling.Ignore)]
		public string Side { get; }

		[JsonProperty("context", NullValueHandling = NullValueHandling.Ignore)]
		public PullRequestContext Context { get; }

		public PullRequestDiffUri(
			string path, 
			string repoId, 
			string baseBranch, 
			string headBranch, 
			string leftSha, 
			string rightSha, 
			string side,
			PullRequestContext context)
		{
			Path = path;
			RepoId = repoId;
			BaseBranch = baseBranch;
			HeadBranch = headBranch;
			LeftSha = leftSha;
			RightSha = rightSha;
			Side = side;
			Context = context;

			var jsonContent = JsonConvert.SerializeObject(this);
			var utf8Bytes = Encoding.UTF8.GetBytes(jsonContent);
			var base64Content = Convert.ToBase64String(utf8Bytes);

			Uri = new Uri($"codestream-diff://-0-/{base64Content}/-0-/{Path}");
		}

		public static bool TryParse(string str, out PullRequestDiffUri prDiffUri) {
			prDiffUri = null;

			if (str.IsNullOrWhiteSpace()) {
				return false;
			}

			var match = Regex.Match(str);
			if (!match.Success) {
				return false;
			}

			if (match.Groups["payload"] == null)
			{
				return false;
			}

			var base64Payload = Convert.FromBase64String(match.Groups["payload"].ToString());
			var serializedPayload = Encoding.UTF8.GetString(base64Payload);

			prDiffUri = JsonConvert.DeserializeObject<PullRequestDiffUri>(serializedPayload);
			return true;
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
	}
}
