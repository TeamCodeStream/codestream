using System;
using System.Windows;
using System.Windows.Controls;

using Microsoft.CodeAnalysis.CSharp;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;
using Microsoft.VisualStudio.Text.Tagging;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal class CodeLevelMetricsMargin : Canvas, IWpfTextViewMargin
	{
		private readonly IWpfTextView _textView;
		private readonly IWpfTextViewHost _wpfTextViewHost;
		private readonly IGlyphFactoryProvider _glyphFactoryProvider;
		private readonly ITagAggregator<CodeLevelMetricsGlyph> _tagAggregator;

		public CodeLevelMetricsMargin(
			IWpfTextViewHost wpfTextViewHost,
			IGlyphFactoryProvider glyphFactoryProvider,
			IViewTagAggregatorFactoryService viewTagAggregatorFactoryService
		)
		{
			_textView = wpfTextViewHost.TextView;
			_wpfTextViewHost = wpfTextViewHost;
			_glyphFactoryProvider = glyphFactoryProvider;

			_tagAggregator =
				viewTagAggregatorFactoryService.CreateTagAggregator<CodeLevelMetricsGlyph>(
					_textView
				);

			_textView.LayoutChanged += OnLayoutChanged;

			Width = MarginSize;
		}

		public ITextViewMargin GetTextViewMargin(string marginName) =>
			string.Equals(marginName, "CodeLevelMetricsMargin", StringComparison.OrdinalIgnoreCase)
				? this
				: null;

		private void OnLayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
		{
			var spans = e.NewOrReformattedSpans;

			if (spans is null || spans.Count == 0)
			{
				return;
			}

			var snapshot = spans[0].Snapshot;
			var text = snapshot.GetText();
			var tree = CSharpSyntaxTree.ParseText(text);
			var root = tree.GetCompilationUnitRoot();

			var glyphFactory = _glyphFactoryProvider.GetGlyphFactory(_textView, this);

			// Iterate through the lines in the view
			foreach (var line in e.NewOrReformattedLines)
			{
				// Get the custom glyph tags for the line
				var tags = _tagAggregator.GetTags(line.ExtentAsMappingSpan);

				foreach (var tag in tags)
				{
					// Create a glyph for the custom tag
					var glyph = glyphFactory.GenerateGlyph((IWpfTextViewLine)(line), tag.Tag);

					if (glyph != null)
					{
						// Position the glyph and add it to the margin
						Canvas.SetLeft(glyph, line.Left);
						Canvas.SetTop(glyph, line.Top);
						Children.Add(glyph);
					}
				}
			}
		}

		public double MarginSize => 20;
		public bool Enabled => true;
		public FrameworkElement VisualElement => this;

		public void Dispose() { }
	}
}
