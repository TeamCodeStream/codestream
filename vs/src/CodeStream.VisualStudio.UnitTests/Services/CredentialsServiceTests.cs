using System;
using CodeStream.VisualStudio.UnitTests.Stubs;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Services
{
    public class CredentialsServiceTests
    {
        [Fact]
        public void AllTest()
        {
            var email = "a@b.com";
            var serverUri = new Uri("http://foo.com");
            var secret = "sEcReT";

            var testCredentialsService = new CredentialsServiceStub();

            var saved = testCredentialsService.SaveAsync(serverUri, email, secret);
            Assert.True(saved.Result);

            var exists = testCredentialsService.LoadAsync(serverUri, email);
            Assert.True(exists.Result.Item1 == email);
            Assert.True(exists.Result.Item2 == secret);

            var deleted = testCredentialsService.DeleteAsync(serverUri, email);
            Assert.True(deleted.Result);
        }
    }
}
