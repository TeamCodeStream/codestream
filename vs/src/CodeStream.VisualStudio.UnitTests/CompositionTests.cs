using System;
using System.Collections.Generic;
using System.ComponentModel.Composition.Hosting;
using System.IO;
using System.Linq;
using System.Reflection;
using CompositionTests;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests {
	//https://docs.microsoft.com/en-us/previous-versions/dotnet/netframework-4.0/ff576068%28v%3dvs.100%29
	//https://stackoverflow.com/questions/8324302/how-to-debug-mef-exception

	public class CompositionTests {

		private Lazy<string> SourceDirectory => new Lazy<string>(() =>
			Path.GetFullPath(AppDomain.CurrentDomain.BaseDirectory + @"..\..\..\..\..\CodeStream.VisualStudio\bin\x86\Debug\"));

		[Fact(Skip = "need to figure out directory when in release")]
		public void VerifyComposition() {
			var assemblyNames = GetAssemblyNames(SourceDirectory.Value, "CodeStream.VisualStudio.dll");
			var assemblies = assemblyNames.Select(Assembly.Load);
			foreach (var assembly in assemblies) {
				MefComposition.VerifyAssemblyCatalog(new AssemblyCatalog(assembly));
			}
		}

		/// <summary>
		/// Gets the names of assemblies that belong to the application .exe folder.
		/// </summary>
		/// <returns>A list of assembly names.</returns>
		private static IEnumerable<string> GetAssemblyNames(string path, string filter = "*") {
			foreach (var file in Directory.EnumerateFiles(Path.GetDirectoryName(path), filter)) {
				string assemblyFullName = null;
				try {
					var assemblyName = AssemblyName.GetAssemblyName(file);
					if (assemblyName != null) {
						assemblyFullName = assemblyName.FullName;
					}
				}
				catch (Exception) {
				}

				if (assemblyFullName != null) {
					yield return assemblyFullName;
				}
			}
		}

		///// <summary>
		///// The MEF discovery module to use (which finds both MEFv1 and MEFv2 parts).
		///// </summary>
		//private readonly PartDiscovery discoverer = PartDiscovery.Combine(
		//	new AttributedPartDiscovery(Resolver.DefaultInstance, isNonPublicSupported: true),
		//	new AttributedPartDiscoveryV1(Resolver.DefaultInstance));


		///// <summary>
		///// Creates a catalog with all the assemblies from the application .exe's directory.
		///// </summary>
		///// <returns>A task whose result is the <see cref="ComposableCatalog"/>.</returns>
		//private async Task<ComposableCatalog> CreateProductCatalogAsync() {
		//	var assemblyNames = GetAssemblyNames();
		//	//var assemblyNames = new List<string>() {
		//	//	@"C:\Users\brian\code\CodeStream\vs-codestream\src\CodeStream.VisualStudio\bin\x86\Debug\CodeStream.VisualStudio.dll"
		//	//};

		//	var assemblies = assemblyNames.Select(Assembly.Load);
		//	var discoveredParts = await this.discoverer.CreatePartsAsync(assemblies);
		//	var catalog = ComposableCatalog.Create(Resolver.DefaultInstance)
		//		.AddParts(discoveredParts);
		//	return catalog;
		//}

		//[Fact(Skip = "Used locally")]
		//public async Task HandleAsyncTest() {

		//	var catalog = await CreateProductCatalogAsync();
		//	//var discovery = PartDiscovery.Combine(
		//	//	new AttributedPartDiscovery(Resolver.DefaultInstance), // "NuGet MEF" attributes (Microsoft.Composition)
		//	//	new AttributedPartDiscoveryV1(Resolver.DefaultInstance)); // ".NET MEF" attributes (System.ComponentModel.Composition)

		//	//// Build up a catalog of MEF parts
		//	//var catalog = ComposableCatalog.Create(Resolver.DefaultInstance)
		//	//	.AddParts(await discovery.CreatePartsAsync(Assembly.GetExecutingAssembly()))
		//	//	.WithCompositionService(); // Makes an ICompositionService export available to MEF parts to import

		//	// Assemble the parts into a valid graph.
		//	var config = CompositionConfiguration.Create(catalog);

		//	// Prepare an ExportProvider factory based on this graph.
		//	var epf = config.CreateExportProviderFactory();

		//	// Create an export provider, which represents a unique container of values.
		//	// You can create as many of these as you want, but typically an app needs just one.
		//	var exportProvider = epf.CreateExportProvider();
		//	for (var i = 0; i < 1000; i++) {
		//		exportProvider.GetExportedValue<IEventAggregator>();
		//		exportProvider.GetExportedValue<ISessionService>();
		//		exportProvider.GetExportedValue<ISettingsService>();
		//		exportProvider.GetExportedValue<ICodeStreamService>();
		//		exportProvider.GetExportedValue<ICodeStreamAgentService>();
		//	}
		//}
	}
}
