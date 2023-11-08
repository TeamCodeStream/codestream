using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;

using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Linq;

using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft;
using CSConstants = CodeStream.VisualStudio.Core.Constants;
using CodeStream.VisualStudio.Core.Extensions;

using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal class CodeLevelMetricsGlyphTagger : ITagger<CodeLevelMetricsGlyph>
	{
		private readonly IServiceProvider _serviceProvider;
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;
		private readonly IVsSolution _vsSolution;

		public CodeLevelMetricsGlyphTagger(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider,
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService
		)
		{
			_serviceProvider = serviceProvider;
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;
			_vsSolution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
			Assumes.Present(_vsSolution);
		}

		IEnumerable<ITagSpan<CodeLevelMetricsGlyph>> ITagger<CodeLevelMetricsGlyph>.GetTags(
			NormalizedSnapshotSpanCollection spans
		)
		{
			if (!_sessionService.IsReady)
			{
				yield break;
			}

			if (spans.Count == 0)
			{
				yield break;
			}

			var snapshot = spans[0].Snapshot;
			var text = snapshot.GetText();
			var tree = CSharpSyntaxTree.ParseText(text);
			var root = tree.GetCompilationUnitRoot();
			var solution = new Uri(_vsSolution.GetSolutionFile());

			// get the namespace
			var namespaceDeclarations = root.DescendantNodes().OfType<NamespaceDeclarationSyntax>();

			foreach (var namespaceDeclaration in namespaceDeclarations)
			{
				var classDeclarations = namespaceDeclaration
					.ChildNodes()
					.OfType<ClassDeclarationSyntax>();

				foreach (var classDeclaration in classDeclarations)
				{
					var classAndNamespace =
						$"{namespaceDeclaration.Name}.{classDeclaration.Identifier}";

					var classMetrics = ThreadHelper.JoinableTaskFactory.Run(
						async () =>
							await _codeStreamAgentService.GetFileLevelTelemetryAsync(
								solution.AbsoluteUri,
								"csharp",
								false,
								classAndNamespace,
								null,
								true,
								true
							)
					);

					var methodDeclarations = classDeclaration
						.ChildNodes()
						.OfType<MethodDeclarationSyntax>();

					foreach (var methodDeclaration in methodDeclarations)
					{
						var namespaceFunction =
							$"{namespaceDeclaration.Name}.{classDeclaration.Identifier}.{methodDeclaration.Identifier}";

						var avgDuration = classMetrics.AverageDuration?.SingleOrDefault(
							x =>
								$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
									namespaceFunction
								)
						);
						var errors = classMetrics.ErrorRate?.SingleOrDefault(
							x =>
								$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
									namespaceFunction
								)
						);
						var sampleSize = classMetrics.SampleSize?.SingleOrDefault(
							x =>
								$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
									namespaceFunction
								)
						);

						var methodStartLine = methodDeclaration.Identifier
							.GetLocation()
							.GetLineSpan()
							.StartLinePosition.Line;

						var line = snapshot.GetLineFromLineNumber(methodStartLine);
						var glyphSpan = new SnapshotSpan(snapshot, line.Start, line.Length);

						yield return new TagSpan<CodeLevelMetricsGlyph>(
							glyphSpan,
							new CodeLevelMetricsGlyph(
								namespaceFunction,
								classMetrics.SinceDateFormatted,
								avgDuration,
								errors,
								sampleSize
							)
						);
					}
				}
			}
		}

		public event EventHandler<SnapshotSpanEventArgs> TagsChanged;
	}
}
