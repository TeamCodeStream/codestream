using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace CodeStream.VisualStudio.UnitTests.Extensions
{
    [TestClass()]
    public class DynamicExtensionsTests
    {
        [TestMethod()]
        public void ToExpandoObjectTest()
        {
            var foo = new
            {
                Header = new
                {
                    Name = "foo"
                }
            };

            Assert.AreEqual("foo", foo.GetValue<string>("Header.Name"));
        }
    }
}
