using System.Runtime.InteropServices;

namespace CodeStream.VisualStudio.Shared {

	public interface IVsSettingsPersistanceManager {
	}

	[Guid("9B164E40-C3A2-4363-9BC5-EB4039DEF653")]
	public class SVsSettingsPersistenceManager : IVsSettingsPersistanceManager { }

	public interface IVisualStudioSettingsManager {
		
	}

	public class VisualStudioSettingsManager : IVisualStudioSettingsManager {

		public VisualStudioSettingsManager() {
			
		}
	}
}
