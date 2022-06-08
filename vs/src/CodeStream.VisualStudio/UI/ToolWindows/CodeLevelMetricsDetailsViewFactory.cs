using System;
using System.ComponentModel.Composition;
using System.Windows;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Text.Adornments;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.UI.ToolWindows {

	/// <summary>
	/// Responsible for standing up the datamodel / data conversions for creating the actual WPF view when
	/// triggered from the CodeLens entry
	/// </summary>
	[Export(typeof(IViewElementFactory))]
	[Name("Git commit details UI factory")]
	[TypeConversion(from: typeof(CodeLevelMetricsData), to: typeof(FrameworkElement))]
	[Order]
	internal class ViewElementFaCodeLevelMetricsDetailsViewFactory : IViewElementFactory
	{
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamService _codeStreamService;

		[ImportingConstructor]
		public ViewElementFaCodeLevelMetricsDetailsViewFactory(ISessionService sessionService, ICodeStreamService codeStreamService) {
			_sessionService = sessionService;
			_codeStreamService = codeStreamService;
		}

		public TView CreateViewElement<TView>(ITextView textView, object model) where TView : class
		{
			// Should never happen if the service's code is correct, but it's good to be paranoid.
			if (typeof(FrameworkElement) != typeof(TView))
			{
				throw new ArgumentException($"Invalid type conversion. Unsupported {nameof(model)} or {nameof(TView)} type");
			}

			if (model is CodeLevelMetricsData detailsData)
			{
				var detailsUi = new CodeLevelMetricsDetails(_sessionService, _codeStreamService) {
					DataContext = detailsData
				};
				return detailsUi as TView;
			}

			return null;
		}
	}
}
