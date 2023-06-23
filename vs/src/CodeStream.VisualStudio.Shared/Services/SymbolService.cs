using CodeStream.VisualStudio.Core.Logging;

using Microsoft;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

using Serilog;

using System;
using System.ComponentModel.Composition;
using System.Reactive;
using System.Runtime.Serialization;

namespace CodeStream.VisualStudio.Shared.Services
{

	public interface ISymbolService
	{
		void RevealSymbol(string fullyQualifiedMethodName);
	}

	[Export(typeof(ISymbolService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class SymbolService : ISymbolService
	{
		public Guid CSharpLibrary = new Guid("58f1bad0-2288-45b9-ac3a-d56398f7781d");

		// here for completeness, but we don't currently support this anyway
		public Guid VBLibrary = new Guid("414AC972-9829-4B6A-A8D7-A08152FEB8AA");


		private static readonly ILogger Log = LogManager.ForContext<SymbolService>();
		private readonly IVsObjectManager2 _objectManager;
		private readonly IVsSimpleLibrary2 _library;

		[ImportingConstructor]
		public SymbolService([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			if (serviceProvider == null)
			{
				throw new ArgumentNullException(nameof(serviceProvider));
			}

			_objectManager = serviceProvider.GetService(typeof(SVsObjectManager)) as IVsObjectManager2;
			Assumes.Present(_objectManager);

			if (_objectManager.FindLibrary(ref CSharpLibrary, out var library) == VSConstants.S_OK)
			{
				_library = (IVsSimpleLibrary2)library;
			}

			Log.Error($"Unable to acquire C# Library Metadata");
		}

		public void RevealSymbol(string fullyQualifiedMethodName)
		{
			if(_library == null)
			{
				return;
			}

			ThreadHelper.ThrowIfNotOnUIThread();

			var searchCriteria = CreateSearchCriteria(fullyQualifiedMethodName);
			var searchResult = _library.GetList2(
				(uint)_LIB_LISTTYPE.LLT_MEMBERS,
					(uint)_LIB_LISTFLAGS.LLF_USESEARCHFILTER,
					searchCriteria,
					out var list);

			if (searchResult == VSConstants.S_OK && list != null)
			{
				list.CanGoToSource(0, VSOBJGOTOSRCTYPE.GS_DEFINITION, out var canGoOkay);

				if (canGoOkay == 0)
				{
					list.GoToSource(0, VSOBJGOTOSRCTYPE.GS_DEFINITION);
				}
			}
		}

		private static VSOBSEARCHCRITERIA2[] CreateSearchCriteria(string fullyQualifiedMethodName)
		{
			return new[]
			{
				new VSOBSEARCHCRITERIA2
				{
					eSrchType = VSOBSEARCHTYPE.SO_PRESTRING,
                    grfOptions = (uint)_VSOBSEARCHOPTIONS.VSOBSO_LOOKINREFS,
					szName = fullyQualifiedMethodName
				}
			};
		}
	}
}
