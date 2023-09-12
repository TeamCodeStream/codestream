using System;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface ICredentialsService
	{
		Task<Tuple<string, string, string>> LoadAsync(Uri uri, string email, string teamId = "");
		Task<bool> SaveAsync(Uri uri, string email, string secret, string teamId = "");
		bool SaveJson(Uri uri, string email, JToken secret, string teamId = "");
		Task<bool> SaveJsonAsync(Uri uri, string email, JToken secret, string teamId = "");
		Task<bool> DeleteAsync(Uri uri, string email, string teamId = "");
		Task<JToken> LoadJsonAsync(Uri uri, string email, string teamId = "");
	}
}
