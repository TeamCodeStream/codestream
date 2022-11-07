using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.UnitTests.Stubs;
using Microsoft.VisualStudio.Editor;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.TextManager.Interop;
using Microsoft.VisualStudio.Utilities;
using Moq;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Reactive.Subjects;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.Shared.UI;
using CodeStream.VisualStudio.Shared.UI.Margins;
using Microsoft.VisualStudio.Text.Projection;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.UI {
	
	public class TextViewCreationListenerTests {
		[Fact]
		public void TextViewCreationListenerTest() {

			var textView = new Mock<IVsTextView>();
			var wpfTextViewMock = new Mock<IWpfTextView>();
			wpfTextViewMock.Setup(_ => _.Roles).Returns(new FakeTextViewRoleSet(TextViewRoles.DefaultDocumentRoles));
			wpfTextViewMock.Setup(_ => _.Selection).Returns(new Mock<ITextSelection>().Object);
			var codeStreamMarginProviderMock = new Mock<ICodeStreamMarginProvider>();
			codeStreamMarginProviderMock.Setup(_ => _.TextViewMargin).Returns(new Mock<ICodeStreamWpfTextViewMargin>().Object);
			var textViewMarginProviders = new List<IWpfTextViewMarginProvider> {
				codeStreamMarginProviderMock.Object
			};

			var pc = new PropertyCollection();
			wpfTextViewMock.Setup(_ => _.Properties).Returns(pc);
			wpfTextViewMock.Setup(_ => _.Caret).Returns(new Mock<ITextCaret>().Object);
			wpfTextViewMock.Setup(_ => _.BufferGraph).Returns(new Mock<IBufferGraph>().Object);

			var textDocumentFactoryServiceMock = new Mock<ITextDocumentFactoryService>();
			var textDocument = new Mock<ITextDocument>();
			textDocument.Setup(_ => _.FilePath).Returns(@"C:\cheese.cs");
			var td = textDocument.Object;
			textDocumentFactoryServiceMock.Setup(_ => _.TryGetTextDocument(It.IsAny<ITextBuffer>(), out td)).Returns(true);

			var editorAdaptersFactoryServiceMock = new Mock<IVsEditorAdaptersFactoryService>();
			editorAdaptersFactoryServiceMock.Setup(_ => _.GetWpfTextView(textView.Object))
				.Returns(wpfTextViewMock.Object);

			var bufferCollection = new Collection<ITextBuffer>(new List<ITextBuffer> { new Mock<ITextBuffer>().Object });
			var reason = ConnectionReason.TextViewLifetime;
			var textViewCache = new WpfTextViewCache();
			var eventAggregator = new Mock<IEventAggregator>();
			eventAggregator.Setup(_ => _.GetEvent<DocumentMarkerChangedEvent>(
#if DEBUG
				"", 0,""
#endif
				)).Returns(new Subject<DocumentMarkerChangedEvent>());
			eventAggregator.Setup(_ => _.GetEvent<SessionReadyEvent>(
#if DEBUG
				"", 0, ""
#endif
				)).Returns(new Subject<SessionReadyEvent>());
			eventAggregator.Setup(_ => _.GetEvent<SessionLogoutEvent>(
#if DEBUG
				"", 0, ""
#endif
				)).Returns(new Subject<SessionLogoutEvent>());
			eventAggregator.Setup(_ => _.GetEvent<MarkerGlyphVisibilityEvent>(
#if DEBUG
				"", 0, ""
#endif
				)).Returns(new Subject<MarkerGlyphVisibilityEvent>());

			var codeStreamAgentService = new Mock<ICodeStreamAgentServiceFactory>();

			var codeStreamServiceMock = new Mock<ICodeStreamService>();
			

			var listener = new TextViewCreationListener() {
				CodeStreamService = codeStreamServiceMock.Object,
				EditorAdaptersFactoryService = editorAdaptersFactoryServiceMock.Object,
				TextDocumentFactoryService = textDocumentFactoryServiceMock.Object,
				TextViewMarginProviders = textViewMarginProviders,
				EditorService = new Mock<IEditorService>().Object,
				TextViewCache = new WpfTextViewCache(),
				EventAggregator = eventAggregator.Object,
				CodeStreamAgentServiceFactory = codeStreamAgentService.Object,
				SessionService= new Mock<ISessionService>().Object,
			
			};

			((IWpfTextViewConnectionListener)listener).SubjectBuffersConnected(wpfTextViewMock.Object, reason, bufferCollection);
			var propertyCount = wpfTextViewMock.Object.Properties.PropertyList.Count;
			Assert.Equal(1, textViewCache.Count());
			Assert.True(propertyCount > 0);

			listener.VsTextViewCreated(textView.Object);
			listener.OnSessionReadyAsync(wpfTextViewMock.Object);
			Assert.True(wpfTextViewMock.Object.Properties.PropertyList.Count > propertyCount);

			((IWpfTextViewConnectionListener)listener).SubjectBuffersDisconnected(wpfTextViewMock.Object, reason, bufferCollection);
			Assert.Equal(0, textViewCache.Count());
			Assert.True(wpfTextViewMock.Object.Properties.PropertyList.Count == 0);
		}
	}
}
