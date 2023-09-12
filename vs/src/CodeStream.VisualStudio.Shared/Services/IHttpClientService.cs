using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface IHttpClientService
	{
		NREnvironmentSettings GetNREnvironmentSettings();
	}
}
