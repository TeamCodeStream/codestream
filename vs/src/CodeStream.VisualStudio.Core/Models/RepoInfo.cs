using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class RepoInfo {
		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }
		[JsonProperty("name", NullValueHandling = NullValueHandling.Ignore)]
		public string Name { get; set; }
		[JsonProperty("remote", NullValueHandling = NullValueHandling.Ignore)]
		public string Remote { get; set; }
	}
}
