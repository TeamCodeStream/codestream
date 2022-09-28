using CodeStream.VisualStudio.Core.Extensions;

using System.IO;

namespace CodeStream.VisualStudio.Core.Models {
	public static class DiffExtensions
	{
		// double this up with Path/Path to remove the trailing double slashes
		public static string TempDirectoryPath
			=> Path.GetDirectoryName(Path.GetTempPath());

		public static bool IsTempFile(string filePath) 
			=> !filePath.IsNullOrWhiteSpace() 
			   && Path.GetDirectoryName(filePath).Contains(TempDirectoryPath);
	}
}
