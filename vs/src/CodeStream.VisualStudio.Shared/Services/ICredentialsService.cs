using System;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Services {
	public interface ICredentialsService {
		Task<Tuple<string, string>> LoadAsync(Uri uri, string email);
		Task<bool> SaveAsync(Uri uri, string email, string secret);
		bool SaveJson(Uri uri, string email, JToken secret);
		Task<bool> SaveJsonAsync(Uri uri, string email, JToken secret);
		Task<bool> DeleteAsync(Uri uri, string email);
		Task<JToken> LoadJsonAsync(Uri uri, string email);
	}
}
