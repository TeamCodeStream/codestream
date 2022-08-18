using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Models
{
    public class CamelCaseStringEnumConverterTests
    {
        [Fact]
        public void CamelCaseStringEnumConverterTest()
        {
            var foo = new Foo { Type = CodemarkType.Prcomment };
            var json = foo.ToJson();

            var result = json.FromJson<Foo>();
            Assert.True(json.Contains("prcomment"));
            Assert.Equal(CodemarkType.Prcomment, result.Type);
        }

        class Foo
        {
            public CodemarkType Type { get; set; }
        }
    }
}
