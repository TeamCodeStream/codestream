using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Services;

using Microsoft.VisualStudio.Shell.Interop;
using EnvDTE;

using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Threading;

using CSConstants = CodeStream.VisualStudio.Core.Constants;
using System.Text.RegularExpressions;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal class CodeLevelMetricsGlyphTagger : ITagger<IGlyphTag>
	{
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;

		private readonly IVsSolution _vsSolution;

		public CodeLevelMetricsGlyphTagger(
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService,
			IVsSolution vsSolution
		)
		{
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;

			_vsSolution = vsSolution;
		}

		IEnumerable<ITagSpan<IGlyphTag>> ITagger<IGlyphTag>.GetTags(
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

			//example: "avg duration: ${averageDuration} | error rate: ${errorRate} - ${sampleSize} samples in the last ${since}"
			var formatString = CSConstants.CodeLevelMetrics.GoldenSignalsFormat.ToLower();
			var includeAverageDuration = formatString.Contains(
				CSConstants.CodeLevelMetrics.Tokens.AverageDuration
			);
			var includeErrorRate = formatString.Contains(
				CSConstants.CodeLevelMetrics.Tokens.ErrorRate
			);

			// get the namespace
			var namespaceDeclarations = root.DescendantNodes().OfType<NamespaceDeclarationSyntax>();

			foreach (var namespaceDeclaration in namespaceDeclarations)
			{
				var classDeclarations = namespaceDeclaration
					.ChildNodes()
					.OfType<ClassDeclarationSyntax>();

				foreach (var classDeclaration in classDeclarations)
				{
					var methodDeclarations = classDeclaration
						.ChildNodes()
						.OfType<MethodDeclarationSyntax>();

					foreach (var methodDeclaration in methodDeclarations)
					{
						var namespaceFunction =
							$"{namespaceDeclaration.Name}.{classDeclaration.Identifier}.{methodDeclaration.Identifier}";

						var methodStartLine = methodDeclaration.Identifier
							.GetLocation()
							.GetLineSpan()
							.StartLinePosition.Line;

						var line = snapshot.GetLineFromLineNumber(methodStartLine);
						var glyphSpan = new SnapshotSpan(snapshot, line.Start, line.Length);

						var metrics = _codeStreamAgentService
							.GetFileLevelTelemetryAsync(
								solution.AbsoluteUri,
								"csharp",
								false,
								namespaceFunction,
								null,
								includeAverageDuration,
								includeErrorRate
							)
							.ConfigureAwait(false)
							.GetAwaiter()
							.GetResult();

						if (metrics is null)
						{
							continue;
						}

						var avgDuration = metrics.AverageDuration
							?.SingleOrDefault(
								x =>
									$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
										namespaceFunction
									)
							)
							?.AverageDuration;

						var errors = metrics.ErrorRate
							?.SingleOrDefault(
								x =>
									$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
										namespaceFunction
									)
							)
							?.ErrorRate;

						var sampleSize = metrics.SampleSize
							?.SingleOrDefault(
								x =>
									$"{x.Namespace}.{x.ClassName}.{x.FunctionName}".EqualsIgnoreCase(
										namespaceFunction
									)
							)
							?.SampleSize;

						var formatted = Regex.Replace(
							formatString,
							Regex.Escape(CSConstants.CodeLevelMetrics.Tokens.AverageDuration),
							avgDuration is null ? "n/a" : $"{avgDuration.ToFixed(3)}ms",
							RegexOptions.IgnoreCase
						);
						formatted = Regex.Replace(
							formatted,
							Regex.Escape(CSConstants.CodeLevelMetrics.Tokens.ErrorRate),
							errors is null ? "n/a" : $"{errors.ToFixed(3)}%",
							RegexOptions.IgnoreCase
						);
						formatted = Regex.Replace(
							formatted,
							Regex.Escape(CSConstants.CodeLevelMetrics.Tokens.Since),
							metrics.SinceDateFormatted,
							RegexOptions.IgnoreCase
						);
						formatted = Regex.Replace(
							formatted,
							Regex.Escape(CSConstants.CodeLevelMetrics.Tokens.SampleSize),
							sampleSize is null ? "0" : $"{sampleSize}",
							RegexOptions.IgnoreCase
						);

						yield return new TagSpan<CodeLevelMetricsGlyph>(
							glyphSpan,
							new CodeLevelMetricsGlyph(formatted)
						);
					}
				}
			}
		}

		public event EventHandler<SnapshotSpanEventArgs> TagsChanged;
	}
}
