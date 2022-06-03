using System.Collections.Generic;

namespace CodeStream.VisualStudio.Core.Models
{
	public class EntityAccount {
		public string AlertSeverity { get; set; }
		public long AccountId { get; set; }
		public string AccountName { get; set; }
		public string EntityGuid { get; set; }
		public string EntityName { get; set; }
		public IDictionary<string, string[]> Tags { get; set; } = new Dictionary<string, string[]>();
	}
}
