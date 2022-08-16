using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class Error {
		[JsonProperty("message", NullValueHandling = NullValueHandling.Ignore)]
		public string Message { get; set; }
		[JsonProperty("type", NullValueHandling = NullValueHandling.Ignore)]
		public string Type { get; set; }
	}
}
