using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Core.Services {

	public interface IHttpClientService {
		Task<NREnvironmentSettings> GetNREnvironmentSettingsAsync();
	}
}
