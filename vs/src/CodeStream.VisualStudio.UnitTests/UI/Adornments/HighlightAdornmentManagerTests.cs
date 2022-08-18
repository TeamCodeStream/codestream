using Microsoft.VisualStudio.Text.Editor;
using Moq;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using CodeStream.VisualStudio.Core.Adornments;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Formatting;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.UI.Adornments {
	public class HighlightAdornmentManagerTests {
		private MockRepository _mockRepository;
		private Mock<IWpfTextView> _mockWpfTextView;

		public HighlightAdornmentManagerTests()
		{
			_mockRepository = new MockRepository(MockBehavior.Default);
			_mockWpfTextView = _mockRepository.Create<IWpfTextView>();
			_mockWpfTextView.Setup(_ => _.GetAdornmentLayer(It.IsAny<string>()))
				.Returns(new Mock<IAdornmentLayer>().Object);

			var textViewLineCollection = new Mock<IWpfTextViewLineCollection>();
			textViewLineCollection.SetupAllProperties();
			var lines = new List<IWpfTextViewLine> {
				new Mock<IWpfTextViewLine>().Object,
				new Mock<IWpfTextViewLine>().Object,
				new Mock<IWpfTextViewLine>().Object,
				new Mock<IWpfTextViewLine>().Object,
				new Mock<IWpfTextViewLine>().Object
			};

			textViewLineCollection.Setup(_ => _.WpfTextViewLines).Returns(new ReadOnlyCollection<IWpfTextViewLine>(lines));
			textViewLineCollection.Setup(_ => _.FirstVisibleLine).Returns(lines[0]);
			textViewLineCollection.Setup(_ => _.LastVisibleLine).Returns(lines[4]);
			textViewLineCollection.Setup(_ => _.FormattedSpan).Returns(new SnapshotSpan());
			//TODO figure out why textViewLineCollection throws in the foreach
			_mockWpfTextView.Setup(_ => _.TextViewLines).Returns(textViewLineCollection.Object);
		}
		
		private HighlightAdornmentManager CreateManager() {
			return new HighlightAdornmentManager(_mockWpfTextView.Object);
		}

		[Fact(Skip = "These need work")]
		public void RemoveAllHighlights_StateUnderTest_ExpectedBehavior() {
			var unitUnderTest = this.CreateManager();
			unitUnderTest.RemoveAllHighlights();
			_mockRepository.VerifyAll();
		}

		[Fact(Skip = "Requires too much VS UI/Process")]
		public void Highlight_StateUnderTest_ExpectedBehavior() {
			var unitUnderTest = this.CreateManager();
			var range = new VisualStudio.Core.Models.Range {
				Start = new Position(1, 1),
				End = new Position(5, 5)
			};
			var result = unitUnderTest.Highlight(
				range,
				true);
			Assert.True(result);
		}

		[Fact(Skip = "These need work")]
		public void Dispose_StateUnderTest_ExpectedBehavior() {
			var unitUnderTest = this.CreateManager();
			unitUnderTest.Dispose();
		}
	}
}
