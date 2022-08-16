using System.Collections.Generic;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class EntityAccount {
		[JsonProperty("alertSeverity", NullValueHandling = NullValueHandling.Ignore)]
		public string AlertSeverity { get; set; }
		[JsonProperty("accountId", NullValueHandling = NullValueHandling.Ignore)]
		public long AccountId { get; set; }
		[JsonProperty("accountName", NullValueHandling = NullValueHandling.Ignore)]
		public string AccountName { get; set; }
		[JsonProperty("entityGuid", NullValueHandling = NullValueHandling.Ignore)]
		public string EntityGuid { get; set; }
		[JsonProperty("entityName", NullValueHandling = NullValueHandling.Ignore)]
		public string EntityName { get; set; }
		[JsonProperty("tags", NullValueHandling = NullValueHandling.Ignore)]
		public IDictionary<string, string[]> Tags { get; set; } = new Dictionary<string, string[]>();
	}
}
