using EnvDTE;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio;
using System.Collections.Generic;
using System;
using Microsoft.VisualStudio.Shell;
using System.ComponentModel.Composition;
using System.Linq;
using Microsoft;
using System.Diagnostics;
using Microsoft.VisualStudio.LanguageServices;
using System.IO;
using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.PlatformUI;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface IFileResolutionService
	{
		string CanResolve(string relativeFilePath);
		void OpenDocument(string relativeFilePath);
	}

	[Export(typeof(IFileResolutionService))]
	public class FileResolutionsService
		: IFileResolutionService
	{
		private readonly VisualStudioWorkspace _visualStudioWorkspace;
		//private readonly string _solutionFile;

		[ImportingConstructor]
		public FileResolutionsService(VisualStudioWorkspace visualStudioWorkspace)
		{
			_visualStudioWorkspace = visualStudioWorkspace;
		}

		public string CanResolve(string relativeFilePath)
		{
			var normalizedFilePath = relativeFilePath.NormalizePath();
			var topDirectoryOfCode = Path.GetDirectoryName(_visualStudioWorkspace.CurrentSolution.FilePath).NormalizePath();
			var filename = Path.GetFileName(relativeFilePath);

			var matchingFilesByName = Directory.GetFiles(topDirectoryOfCode, filename, SearchOption.AllDirectories);

			//easiest one first
			var exactMatch = matchingFilesByName.FirstOrDefault(x => x.EndsWith(normalizedFilePath, StringComparison.OrdinalIgnoreCase));

			if(exactMatch != null){
				return exactMatch.Replace("\\", "/"); ;
			}

			// start lobbing off directories from left to right and try to find a match
			var filePathParts = normalizedFilePath.Split(new string[] {"\\"}, options: StringSplitOptions.RemoveEmptyEntries);

			for(var i = 0; i < filePathParts.Length; ++i)
			{
				var checkParts = filePathParts.Skip(i + 1).ToArray();
				var newPath = Path.Combine(checkParts).NormalizePath();

				var partialMatch = matchingFilesByName.FirstOrDefault(x => x.EndsWith(newPath, StringComparison.OrdinalIgnoreCase));

				if (partialMatch != null)
				{
					return partialMatch.Replace("\\", "/"); ;
				}
			}

			return null;
		}

		public void OpenDocument(string relativeFilePath)
		{
			var documentId = _visualStudioWorkspace.CurrentSolution.GetDocumentIdsWithFilePath(relativeFilePath).FirstOrDefault();

			if(documentId != null)
			{
				_visualStudioWorkspace.OpenDocument(documentId);
			}
		}
	}
}
