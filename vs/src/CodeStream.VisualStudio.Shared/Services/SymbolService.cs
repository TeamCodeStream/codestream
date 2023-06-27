using CodeStream.VisualStudio.Core.Logging;

using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis;
using Microsoft.VisualStudio.Shell;

using Serilog;

using System;
using System.ComponentModel.Composition;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Linq;
using CodeStream.VisualStudio.Core.Extensions;
using EnvDTE;
using Microsoft.CodeAnalysis.MSBuild;
using Microsoft.VisualStudio.Shell.Interop;
using System.Reflection.Metadata.Ecma335;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Shared.Services
{

	public interface ISymbolService
	{
		Task RevealSymbolAsync(string fullyQualifiedMethodName, CancellationToken cancellationToken);
	}

	[Export(typeof(ISymbolService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class SymbolService : ISymbolService
	{
		private static readonly ILogger Log = LogManager.ForContext<SymbolService>();
		private readonly IVsSolution _vsSolution;
		private readonly DTE _dte;

		[ImportingConstructor]
		public SymbolService([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider)
		{
			_vsSolution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
			_dte = serviceProvider.GetService(typeof(DTE)) as DTE;
		}

		public async Task RevealSymbolAsync(string fullyQualifiedMethodName, CancellationToken cancellationToken)
		{

			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

			var solutionPath = _vsSolution.GetSolutionFile();

			await ThreadHelper.JoinableTaskFactory.RunAsync(async () =>
			{
				var workspace = MSBuildWorkspace.Create();
								
				var solution = await workspace.OpenSolutionAsync(solutionPath);

				var documents = solution.Projects.SelectMany(p => p.Documents);

				foreach (var document in documents)
				{
					var root = await document.GetSyntaxRootAsync();

					var namespaceDeclaration = root
						.DescendantNodes()
						.OfType<NamespaceDeclarationSyntax>()
						.FirstOrDefault(ns => fullyQualifiedMethodName.StartsWith(ns.Name.ToString(), StringComparison.OrdinalIgnoreCase));

					if (namespaceDeclaration is null)
					{
						continue;
					}

					var classDeclaration = namespaceDeclaration
						.DescendantNodes()
						.OfType<ClassDeclarationSyntax>()
						.FirstOrDefault(cls => fullyQualifiedMethodName.StartsWith($"{namespaceDeclaration.Name}.{cls.Identifier.ValueText}", StringComparison.OrdinalIgnoreCase));

					if (classDeclaration is null)
					{
						continue;
					}

					var methodDeclaration = classDeclaration
						.DescendantNodes()
						.OfType<MethodDeclarationSyntax>()
						.FirstOrDefault(method => fullyQualifiedMethodName.EqualsIgnoreCase($"{namespaceDeclaration.Name}.{classDeclaration.Identifier.ValueText}.{method.Identifier.ValueText}"));

					if (methodDeclaration is null)
					{
						continue;
					}

					var semanticModel = await document.GetSemanticModelAsync();
					ISymbol methodSymbol = semanticModel.GetDeclaredSymbol(methodDeclaration);

					var definitionLocation = methodSymbol?.Locations.FirstOrDefault();

					if (definitionLocation is null)
					{
						continue;
					}

					// if we got this far, we found a matching symbol. Switch back to main thread and open file
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

					var filePath = definitionLocation.SourceTree?.FilePath;
					var lineNumber = definitionLocation.GetLineSpan().StartLinePosition.Line + 1;

					var window = _dte.ItemOperations.OpenFile(filePath);
					var textDocument = (EnvDTE.TextDocument)window.Document.Object("TextDocument");

					textDocument.Selection.MoveToLineAndOffset(lineNumber, 1, false);
					textDocument.Selection.GotoLine(lineNumber, true);

					break;
				}
			});
		}
	}
}
