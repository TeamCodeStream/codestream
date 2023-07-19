using System;
using System.ComponentModel.Composition;
using System.Linq;
using Microsoft.VisualStudio.LanguageServices;
using System.IO;
using CodeStream.VisualStudio.Core.Extensions;
using Microsoft.VisualStudio.PlatformUI;
using CodeStream.VisualStudio.Core.Logging;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface IFileResolutionService
	{
		string ResolveLocal(string relativeFilePath);
	}

	[Export(typeof(IFileResolutionService))]
	public class FileResolutionsService
		: IFileResolutionService
	{
		private readonly VisualStudioWorkspace _visualStudioWorkspace;
		private static readonly ILogger Log = LogManager.ForContext<FileResolutionsService>();

		[ImportingConstructor]
		public FileResolutionsService(VisualStudioWorkspace visualStudioWorkspace)
		{
			_visualStudioWorkspace = visualStudioWorkspace;
		}

		public string ResolveLocal(string relativeFilePath)
		{
			try
			{
				var normalizedFilePath = relativeFilePath.NormalizePath();
				var topDirectoryOfCode = Path.GetDirectoryName(_visualStudioWorkspace.CurrentSolution.FilePath).NormalizePath();
				var filename = Path.GetFileName(relativeFilePath);

				var matchingFilesByName = Directory.GetFiles(topDirectoryOfCode, filename, SearchOption.AllDirectories);

				//easiest one first
				var exactMatch = matchingFilesByName.FirstOrDefault(x => x.EndsWith(normalizedFilePath, StringComparison.OrdinalIgnoreCase));

				if (exactMatch != null)
				{
					return exactMatch.Replace("\\", "/"); ;
				}

				// start lobbing off directories from left to right and try to find a match
				var filePathParts = normalizedFilePath.Split(new string[] { "\\" }, options: StringSplitOptions.RemoveEmptyEntries);

				for (var i = 0; i < filePathParts.Length; ++i)
				{
					var checkParts = filePathParts.Skip(i + 1).ToArray();
					var newPath = Path.Combine(checkParts).NormalizePath();

					var partialMatch = matchingFilesByName.FirstOrDefault(x => x.EndsWith(newPath, StringComparison.OrdinalIgnoreCase));

					if (partialMatch != null)
					{
						return partialMatch.Replace("\\", "/"); ;
					}
				}
			}
			catch(Exception ex)
			{
				Log.Error(ex, $"Unable to resolve file locally '{relativeFilePath}'");
			}

			return null;
		}
	}
}
