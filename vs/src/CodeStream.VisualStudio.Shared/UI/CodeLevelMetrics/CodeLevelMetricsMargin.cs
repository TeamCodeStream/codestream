using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Shapes;

using CodeStream.VisualStudio.Shared.Extensions;

using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.Internal.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;
using Microsoft.VisualStudio.Text.Tagging;

using UIElement = System.Windows.UIElement;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal class LineElement
	{
		public UIElement Element { get; set; }
		public double LineTop { get; set; }
	}

	internal class CodeLevelMetricsMargin : Canvas, IWpfTextViewMargin
	{
		private readonly IWpfTextView _wpfTextView;
		private readonly ITagAggregator<CodeLevelMetricsGlyph> _tagAggregator;
		private readonly IGlyphFactory _glyphFactory;
		private readonly IWpfTextViewHost _wpfTextViewHost;

		private readonly ConcurrentDictionary<int, LineElement> _uiElements =
			new ConcurrentDictionary<int, LineElement>();

		public CodeLevelMetricsMargin(
			IWpfTextViewHost wpfTextViewHost,
			ITagAggregator<CodeLevelMetricsGlyph> tagAggregator,
			IGlyphFactoryProvider glyphFactoryProvider
		)
		{
			_wpfTextViewHost = wpfTextViewHost;
			_wpfTextView = _wpfTextViewHost.TextView;
			_tagAggregator = tagAggregator;
			_glyphFactory = glyphFactoryProvider.GetGlyphFactory(_wpfTextView, this);

			_wpfTextView.LayoutChanged += OnLayoutChanged;
			Width = MarginSize;
		}

		public ITextViewMargin GetTextViewMargin(string marginName) =>
			string.Equals(marginName, "CodeLevelMetricsMargin", StringComparison.OrdinalIgnoreCase)
				? this
				: null;

		private void OnLayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
		{
			var lines = e.NewOrReformattedLines;

			if (lines.Any())
			{
				Children.Clear();
			}

			foreach (var line in lines)
			{
				var wpfLine = (IWpfTextViewLine)line;

				foreach (var mappingSpan in _tagAggregator.GetTags(wpfLine.ExtentAsMappingSpan))
				{
					var element = _glyphFactory.GenerateGlyph(wpfLine, mappingSpan.Tag);

					SetLeft(element, 0);
					SetTop(element, wpfLine.TextTop);
					Children.Add(element);
				}
			}
		}

		public double MarginSize => 20;
		public bool Enabled => true;
		public FrameworkElement VisualElement => this;

		public void Dispose()
		{
			_wpfTextView.LayoutChanged -= OnLayoutChanged;
		}
	}
}
