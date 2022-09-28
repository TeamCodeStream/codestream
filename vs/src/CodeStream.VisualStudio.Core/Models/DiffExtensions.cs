using System;

using CodeStream.VisualStudio.Core.Extensions;

using System.IO;

namespace CodeStream.VisualStudio.Core.Models {
	public static class DiffExtensions
	{
		// double this up with Path/Path to remove the trailing double slashes
		private static string TempDirectoryPath => NormalizePath(Path.GetTempPath());

		public static bool IsTempFile(string filePath)
		{
			if (filePath.IsNullOrWhiteSpace())
			{
				return false;
			}

			var normalizedFileDirectory = Path.GetDirectoryName(NormalizePath(filePath)) ?? string.Empty;

			return normalizedFileDirectory.Contains(TempDirectoryPath);
		}

		private static string NormalizePath(string path) 
			=> Path
				.GetFullPath(new Uri(path).LocalPath)
				.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
				.ToLowerInvariant();
	}
}
