using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Models
{
    public class EditorSelectionTests
    {
        /// <summary>
        /// This exists because of serialization issue with Range/Position
        /// </summary>
        [Fact]
        public void EditorSelectionTest()
        {
            var foo = new EditorSelection(new Position(1, 1),
                new Range
                {
                    Start = new Position(2, 2),
                    End = new Position(3, 3)
                });

            var json = foo.ToJson();
            var result = json.FromJson<EditorSelection>();
            Assert.Equal(1, result.Cursor.Line);
            Assert.Equal(1, result.Cursor.Character);

            Assert.Equal(2, result.Start.Line);
            Assert.Equal(2, result.Start.Character);

            Assert.Equal(3, result.End.Line);
            Assert.Equal(3, result.End.Character);
        }
    }
}
