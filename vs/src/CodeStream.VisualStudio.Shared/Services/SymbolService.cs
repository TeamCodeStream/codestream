using System;

using CodeStream.VisualStudio.Core.Logging;

using Serilog;

using System.ComponentModel.Composition;
using System.Diagnostics;
using System.Threading;
using Task = System.Threading.Tasks.Task;

using System.Linq;
using System.Threading.Tasks;

using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.VisualStudio.LanguageServices;
using Microsoft.CodeAnalysis.FindSymbols;

namespace CodeStream.VisualStudio.Shared.Services
{

	public interface ISymbolService
	{
		Task RevealSymbolAsync(string fullyQualifiedMethodName, CancellationToken cancellationToken);
		Task<EditorCopySymbolResponse> CopySymbolAsync(EditorCopySymbolRequest request, CancellationToken cancellationToken);
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
			try
			{
				var parts = fullyQualifiedMethodName.Split('.');
				var methodName = parts[parts.Length - 1];

				if (_workspace?.CurrentSolution != null)
				{
					foreach (var project in _workspace.CurrentSolution.Projects.Where(p => p.SupportsCompilation))
					{
						var symbols = (await SymbolFinder
								.FindDeclarationsAsync(project, methodName, true, cancellationToken))
							.Where(x => x.ToDisplayString().EqualsIgnoreCase($"{fullyQualifiedMethodName}()"))
							.ToList();

						var symbol = symbols.FirstOrDefault();

						if (symbol is null)
						{
							continue;
						}

						_ = await _workspace.TryGoToDefinitionAsync(symbol, project, cancellationToken);

						break;
					}
				}
			}
			catch (Exception ex)
			{
				Log.Error(ex, $"Error occurred attempting to resolve and open symbol [{fullyQualifiedMethodName}]");
			}
		}

		public async Task<EditorCopySymbolResponse> CopySymbolAsync(EditorCopySymbolRequest request, CancellationToken cancellationToken)
		{
			try
			{
				if (_workspace?.CurrentSolution != null)
				{
					foreach (var project in _workspace.CurrentSolution.Projects.Where(p => p.SupportsCompilation))
					{
						var symbols = (await SymbolFinder
								.FindDeclarationsAsync(project, request.SymbolName, true, cancellationToken))
							.Where(x => x.ToDisplayString().EqualsIgnoreCase($"{request.Namespace}.{request.SymbolName}()"))
							.ToList();

						var symbol = symbols.FirstOrDefault();

						if (symbol is null)
						{
							continue;
						}

						var symbolSyntax = await symbol.DeclaringSyntaxReferences.FirstOrDefault().GetSyntaxAsync(cancellationToken);
						var span = symbolSyntax.GetLocation().GetLineSpan().Span;

						return new EditorCopySymbolResponse()
						{
							Range = new Range()
							{
								Start = new Position(
									span.Start.Line,
									span.Start.Character
								),
								End = new Position(
									span.End.Line,
									span.End.Character
								)
							},
							Text = symbolSyntax.ToFullString(),
							Success = true
						};
					}
				}
			}
			catch (Exception ex)
			{
				Log.Error(ex, $"Error occurred attempting to resolve and copy symbol [{request.Namespace}.{request.SymbolName}]");
			}

			return new EditorCopySymbolResponse()
			{
				Success = false
			};
		}
	}
}
