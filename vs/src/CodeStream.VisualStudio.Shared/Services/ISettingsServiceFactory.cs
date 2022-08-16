namespace CodeStream.VisualStudio.Shared.Services {
	public interface ISettingsServiceFactory {
		ICodeStreamSettingsManager GetOrCreate(string source = null);
	}
}
