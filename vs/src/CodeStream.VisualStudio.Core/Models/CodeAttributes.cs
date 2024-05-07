using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class CodeAttributes
	{
		[JsonProperty("codeFilepath", NullValueHandling = NullValueHandling.Ignore)]
		public string CodeFilepath { get; set; }

		[JsonProperty("codeNamespace", NullValueHandling = NullValueHandling.Ignore)]
		public string CodeNamespace { get; set; }

		[JsonProperty("codeFunction", NullValueHandling = NullValueHandling.Ignore)]
		public string CodeFunction { get; set; }
	}
}
