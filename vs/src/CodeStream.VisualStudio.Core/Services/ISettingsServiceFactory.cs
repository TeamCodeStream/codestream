namespace CodeStream.VisualStudio.Core.Services {
	public interface ISettingsServiceFactory {
		ICodeStreamSettingsManager GetOrCreate(string source = null);
	}
}
