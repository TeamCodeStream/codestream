namespace CodeStream.VisualStudio.Core.Services {
	public interface ISettingsServiceFactory {
		ISettingsManager GetOrCreate(string source = null);
	}
}
