using System;
using System.Threading.Tasks;

using CodeStream.VisualStudio.UnitTests.Stubs;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services
{
    public class CredentialsServiceTests
    {
        [Fact]
        public async Task AllTest()
        {
            const string email = "a@b.com";
            const string team = "AWESOME";
            var serverUri = new Uri("http://foo.com");
            const string secret = "sEcReT";

            var testCredentialsService = new FakeCredentialsService();

            var saved = await testCredentialsService.SaveAsync(serverUri, email, secret,team);
            Assert.True(saved);

            var exists = await testCredentialsService.LoadAsync(serverUri, email, team);
            Assert.True(exists.Item1 == email);
            Assert.True(exists.Item2 == secret);
            Assert.True(exists.Item3 == team);

            var deleted = await testCredentialsService.DeleteAsync(serverUri, email, team);
            Assert.True(deleted);
        }
    }
}
