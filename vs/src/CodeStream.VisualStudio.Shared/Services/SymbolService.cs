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
using Microsoft.VisualStudio.LanguageServices;
using Microsoft.CodeAnalysis.FindSymbols;
using VSLangProj80;

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
		private readonly VisualStudioWorkspace _workspace;

		[ImportingConstructor]
		public SymbolService(VisualStudioWorkspace workspace)
		{
			_workspace = workspace;
		}

		public async Task RevealSymbolAsync(string fullyQualifiedMethodName, CancellationToken cancellationToken)
		{
			var parts = fullyQualifiedMethodName.Split('.');
			var methodName = parts[parts.Length - 1];

			if (_workspace?.CurrentSolution != null)
			{

				foreach (var project in _workspace.CurrentSolution.Projects)
				{
					if (project.SupportsCompilation)
					{
						var symbols = (await SymbolFinder
							.FindDeclarationsAsync(project, methodName, true))
							.Where(x => x.ToDisplayString().EqualsIgnoreCase($"{fullyQualifiedMethodName}()"));
						
						if (symbols != null && symbols.Any())
						{
							var symbol = symbols.FirstOrDefault();
							_ = await _workspace.TryGoToDefinitionAsync(symbol, project, cancellationToken);
							break;
						}
					}
				}

			}
		}
	}
}
