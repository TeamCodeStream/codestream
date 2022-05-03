using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Core.Services {
	public interface IHttpClientService {
		Task<NREnvironmentSettings> GetNREnvironmentSettingsAsync();
	}
}
