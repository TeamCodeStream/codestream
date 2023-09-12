using Microsoft.VisualStudio.Text.Editor;
using Moq;

using CodeStream.VisualStudio.Core.Adornments;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.UI.Adornments
{
	public class HighlightAdornmentManagerTests
	{
		private readonly Mock<IWpfTextView> _mockWpfTextView;
		private readonly Mock<IAdornmentLayer> _mockAdornmentLayer;

		public HighlightAdornmentManagerTests()
		{
			_mockWpfTextView = new Mock<IWpfTextView>();
			_mockAdornmentLayer = new Mock<IAdornmentLayer>();

			_mockWpfTextView
				.Setup(_ => _.GetAdornmentLayer(It.IsAny<string>()))
				.Returns(_mockAdornmentLayer.Object);
		}

		private HighlightAdornmentManager CreateManager() =>
			new HighlightAdornmentManager(_mockWpfTextView.Object);

		[Fact]
		public void RemoveAllHighlights_StateUnderTest_ExpectedBehavior()
		{
			var unitUnderTest = CreateManager();
			unitUnderTest.RemoveAllHighlights();

			_mockAdornmentLayer.Verify(x => x.RemoveAllAdornments(), Times.AtMostOnce);
		}
	}
}
