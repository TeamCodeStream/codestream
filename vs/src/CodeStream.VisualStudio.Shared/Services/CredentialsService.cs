using Newtonsoft.Json.Linq;
using System;
using System.ComponentModel.Composition;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared.Services {	 

	[Export(typeof(ICredentialsService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class CredentialsService : CredentialsServiceBase, ICredentialsService {
		public Task<Tuple<string, string, string>> LoadAsync(Uri uri, string email, string teamId) 
			=> LoadAsync(uri.ToString(), email, teamId);

		public Task<JToken> LoadJsonAsync(Uri uri, string email, string teamId) 
			=> base.LoadJsonAsync(uri.ToString(), email, teamId);

		public Task<bool> SaveAsync(Uri uri, string email, string secret, string teamId) 
			=> SaveAsync(email, secret, uri.ToString(), email, teamId);

		public Task<bool> SaveJsonAsync(Uri uri, string email, JToken secret, string teamId) 
			=> SaveAsync(email, secret.ToString(Newtonsoft.Json.Formatting.None), uri.ToString(), email, teamId);

		public bool SaveJson(Uri uri, string email, JToken secret, string teamId) 
			=> Save(email, secret.ToString(Newtonsoft.Json.Formatting.None), uri.ToString(), email, teamId);

		public Task<bool> DeleteAsync(Uri uri, string email, string teamId) 
			=> DeleteAsync(uri.ToString(), email, teamId);
	}
}
