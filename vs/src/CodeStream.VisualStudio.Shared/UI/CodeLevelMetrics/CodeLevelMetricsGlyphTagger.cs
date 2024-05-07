using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Tagging;

using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Linq;

using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal class CodeLevelMetricsGlyphTagger : ITagger<CodeLevelMetricsGlyph>
	{
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;
		private readonly IVsSolution _vsSolution;

		public CodeLevelMetricsGlyphTagger(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider,
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService
		)
		{
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

			var namespaceDeclarations = root.DescendantNodes()
				.OfType<BaseNamespaceDeclarationSyntax>()
				.ToList();

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
							await _codeStreamAgentService
								.GetFileLevelTelemetryAsync(
									solution.AbsoluteUri,
									"csharp",
									false,
									classAndNamespace,
									null,
									true,
									true
								)
								.ConfigureAwait(false)
					);

					var methodDeclarations = classDeclaration
						.ChildNodes()
						.OfType<MethodDeclarationSyntax>();

					foreach (var methodDeclaration in methodDeclarations)
					{
						var fullyQualifiedFunctionName =
							$"{namespaceDeclaration.Name}.{classDeclaration.Identifier}.{methodDeclaration.Identifier}";

						var avgDuration = classMetrics?.AverageDuration?.SingleOrDefault(
							x =>
								$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
									fullyQualifiedFunctionName
								)
								|| $"{x.Namespace}.{x.FunctionName}".EqualsIgnoreCase(
									fullyQualifiedFunctionName
								)
						);
						var errors = classMetrics?.ErrorRate?.SingleOrDefault(
							x =>
								$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
									fullyQualifiedFunctionName
								)
								|| $"{x.Namespace}.{x.FunctionName}".EqualsIgnoreCase(
									fullyQualifiedFunctionName
								)
						);
						var sampleSize = classMetrics?.SampleSize?.SingleOrDefault(
							x =>
								$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
									fullyQualifiedFunctionName
								)
								|| $"{x.Namespace}.{x.FunctionName}".EqualsIgnoreCase(
									fullyQualifiedFunctionName
								)
						);

						if (
							(sampleSize is null && avgDuration is null && errors is null)
							|| sampleSize?.SampleSize == 0
						)
						{
							continue;
						}

						var lineSpan = methodDeclaration.Identifier.GetLocation().GetLineSpan();
						var methodStartLine = lineSpan.StartLinePosition.Line;

						var line = snapshot.GetLineFromLineNumber(methodStartLine);
						var glyphSpan = new SnapshotSpan(snapshot, line.Start, line.Length);

						var methodRange = new Range
						{
							Start = new Position(
								lineSpan.StartLinePosition.Line,
								lineSpan.StartLinePosition.Character
							),
							End = new Position(
								lineSpan.EndLinePosition.Line,
								lineSpan.EndLinePosition.Character
							)
						};

						yield return new TagSpan<CodeLevelMetricsGlyph>(
							glyphSpan,
							new CodeLevelMetricsGlyph(
								methodDeclaration.Identifier.ToString(),
								classMetrics,
								avgDuration,
								errors,
								sampleSize,
								methodRange
							)
						);
					}
				}
			}
		}

		public event EventHandler<SnapshotSpanEventArgs> TagsChanged;
	}
}
