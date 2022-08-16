namespace CodeStream.VisualStudio.Core.Models {
	public class User {
		public User(string id, string userName, string emailAddress, string teamName, int teamCount, string orgName, int orgCount) {
			Id = id;
			UserName = userName;
			EmailAddress = emailAddress;
			TeamName = teamName;
			TeamCount = teamCount;
			OrgName = orgName;
			OrgCount = orgCount;
		}

		public string Id { get; }
		public string TeamName { get; }
		public string UserName { get; }
		public string EmailAddress { get; }
		public int TeamCount { get; set; }
		public string OrgName { get; }
		public int OrgCount { get; }

		public bool HasSingleTeam => TeamCount == 1;
		public bool HasSingleOrg => OrgCount == 1;
	}
}
