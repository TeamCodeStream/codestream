using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.UnitTests.Stubs
{
    // this exists only to specify a different bucket name
    public class FakeCredentialsService : CredentialsService
    {
        protected override string GetKey(string key) 
	        => "CodeStream-Tests|" + key;
    }
}
