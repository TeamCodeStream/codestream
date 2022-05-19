using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.MSBuild;
using Microsoft.CodeAnalysis.Text;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Language.CodeLens.Remoting;
using Microsoft.VisualStudio.Threading;

namespace CodeStream.VisualStudio.CodeLens {
	public class CodeLevelMetricDataPoint : IAsyncCodeLensDataPoint {
		private readonly ICodeLensCallbackService _callbackService;
		public readonly string DataPointId = Guid.NewGuid().ToString();

		public VisualStudioConnection VsConnection;
		public event AsyncEventHandler InvalidatedAsync;
		public CodeLensDescriptor Descriptor { get; }

		public CodeLevelMetricDataPoint(CodeLensDescriptor descriptor, ICodeLensCallbackService callbackService) {
			_callbackService = callbackService;
			Descriptor = descriptor ?? throw new ArgumentNullException(nameof(descriptor));
		}

		public async Task<CodeLensDataPointDescriptor> GetDataAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var clmStatus = await _callbackService
				.InvokeAsync<CodeLevelMetricStatus>(this, nameof(ICodeLevelMetricsCallbackService.GetClmStatus), cancellationToken: token)
				.ConfigureAwait(false);

			if (clmStatus != CodeLevelMetricStatus.Ready) {
				return new CodeLensDataPointDescriptor {
					Description = GetStatusText(clmStatus)
				};
			}
			
			var formatString = await _callbackService
				.InvokeAsync<string>(this, nameof(ICodeLevelMetricsCallbackService.GetClmFormatSetting), cancellationToken: token)
				.ConfigureAwait(false);

			var solutionFile = await _callbackService
				.InvokeAsync<string>(this, nameof(ICodeLevelMetricsCallbackService.CurrentSolutionPath), cancellationToken: token)
				.ConfigureAwait(false);

			Debugger.Launch();

			// hack to get the project by matching the output file name - i.e., CodeStream.VisualStudio.CodeLens.dll"
			// because for some reason, the OutputFilePath on one includes /x86/ in the path, and the other doesn't.
			MSBuildWorkspace workspace = MSBuildWorkspace.Create();
			var solution = await workspace.OpenSolutionAsync(solutionFile, cancellationToken: token);
			var project = solution.Projects.SingleOrDefault(x =>
				Path.GetFileName(x.OutputFilePath)
					.Equals(Path.GetFileName(context.Properties["OutputFilePath"].ToString())));

			// hackity hack (for now)
			// as long as your debugging session opens to *THIS FILE*, it will also be the first in the list.
			var document = project.Documents.First();

			var tree = await document.GetSyntaxTreeAsync(token);
			var compilation = CSharpCompilation.Create("Test", new []{ tree });

			// matches nothing - symbol name isn't the fully qualified name - but we could parse and match
			var symbol = compilation.GetSymbolsWithName(s => s.Equals(context.Properties["FullyQualifiedName"].ToString()));

			//works, but not sure what I'm trying to find yet.
			var model = compilation.GetSemanticModel(tree);
			var root = await tree.GetRootAsync(token);

			return new CodeLensDataPointDescriptor {
				Description = formatString,
				TooltipText = solution.FilePath
			};
		}

		public Task<CodeLensDetailsDescriptor> GetDetailsAsync(CodeLensDescriptorContext context, CancellationToken token) {
			var descriptor = new CodeLensDetailsDescriptor();
			
			var headers = new List<CodeLensDetailHeaderDescriptor> {
				new CodeLensDetailHeaderDescriptor {
					UniqueName = "header1",
					Width = .33,
					DisplayName = "Average Duration",
					IsVisible = true
				},
				new CodeLensDetailHeaderDescriptor {
					UniqueName = "header2",
					Width = .33,
					DisplayName = "Throughput",
					IsVisible = true
				},
				new CodeLensDetailHeaderDescriptor {
					UniqueName = "header3",
					Width = .33,
					DisplayName = "Error Rate",
					IsVisible = true
				}
			};

			descriptor.Headers = headers;
			
			var details = new List<CodeLensDetailEntryDescriptor> {
				new CodeLensDetailEntryDescriptor {
					Fields = new List<CodeLensDetailEntryField> {
						new CodeLensDetailEntryField {
							Text = "3ms"
						},
						new CodeLensDetailEntryField {
							Text = "100rpm"
						},
						new CodeLensDetailEntryField {
							Text = "4epm - since 30m ago"
						}
					}
				}
			};
			descriptor.Entries = details;

			return Task.FromResult(descriptor);
		}

		public void Refresh() => _ = InvalidatedAsync?.InvokeAsync(this, EventArgs.Empty).ConfigureAwait(false);

		private static string GetStatusText(CodeLevelMetricStatus currentStatus) {
			switch (currentStatus) {
				case CodeLevelMetricStatus.Loading:
					return "CodeStream Code Level Metrics Loading...";
				case CodeLevelMetricStatus.SignInRequired:
					return "Please sign-in to CodeStream for Code Level Metrics";
				case CodeLevelMetricStatus.Disabled:
					return "CodeLens is enabled, but Code Level Metrics are disabled";
				case CodeLevelMetricStatus.Ready:
				default:
					return "";
			}
		}
	}
}
