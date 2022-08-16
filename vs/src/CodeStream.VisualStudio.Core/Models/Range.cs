using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models {
	/// <summary>
	/// This is a copy of the Range object that ships with MS.LanguageServer.Protocol
	/// </summary>
	public class Range {
		[JsonProperty("start", NullValueHandling = NullValueHandling.Ignore)]
		public Position Start { get; set; }
		[JsonProperty("end", NullValueHandling = NullValueHandling.Ignore)]
		public Position End { get; set; }

		public override string ToString() {
			string result = "Range: ";
			if (Start != null) {
				result += $"Start={Start.Line}:{Start.Character} ";
			}
			if (End != null) {
				result += $"End={End.Line}:{End.Character}";
			}
			return result;
		}
	}
}
