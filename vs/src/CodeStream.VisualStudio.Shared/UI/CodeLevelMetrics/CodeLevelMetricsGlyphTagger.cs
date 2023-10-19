﻿using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Tagging;

using System;
using System.Collections.Generic;
using System.Linq;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	internal class CodeLevelMetricsGlyphTagger : ITagger<IGlyphTag>
	{
		IEnumerable<ITagSpan<IGlyphTag>> ITagger<IGlyphTag>.GetTags(
			NormalizedSnapshotSpanCollection spans
		)
		{
			if (spans.Count == 0)
			{
				yield break;
			}

			var snapshot = spans[0].Snapshot;
			var text = snapshot.GetText();
			var tree = CSharpSyntaxTree.ParseText(text);
			var root = tree.GetCompilationUnitRoot();

			// Find all method declarations in the syntax tree
			var methodDeclarations = root.DescendantNodes()
				.OfType<ClassDeclarationSyntax>()
				.SelectMany(x => x.ChildNodes().OfType<MethodDeclarationSyntax>());

			foreach (var methodDeclaration in methodDeclarations)
			{
				var methodStartLine = methodDeclaration.Identifier
					.GetLocation()
					.GetLineSpan()
					.StartLinePosition.Line;
				var line = snapshot.GetLineFromLineNumber(methodStartLine);
				var glyphSpan = new SnapshotSpan(snapshot, line.Start, line.Length);

				yield return new TagSpan<CodeLevelMetricsGlyph>(
					glyphSpan,
					new CodeLevelMetricsGlyph()
				);
			}
		}

		public event EventHandler<SnapshotSpanEventArgs> TagsChanged;
	}
}
