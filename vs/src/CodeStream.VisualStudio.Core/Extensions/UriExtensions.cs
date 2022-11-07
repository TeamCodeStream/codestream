using System;
using System.IO;

namespace CodeStream.VisualStudio.Core.Extensions 
{
	public static class UriExtensions
	{
		public static string CodeStreamTempPath 
			=> NormalizePath(new Uri(Path.Combine(Path.GetTempPath(), "codestream")));
		
		public static string NormalizePath(this Uri path) 
			=> 	Path.GetFullPath(
					path.LocalPath
						.TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
						.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
						.ToLowerInvariant()
				);
		
		public static bool IsTempFile(this string filePath) 
			=> !string.IsNullOrEmpty(filePath) 
			   && filePath.ToUri().IsTempFile();

		public static bool IsTempFile(this Uri filePath) 
			=> filePath != null
			   && filePath.IsFile 
			   && (NormalizePath(filePath)?.StartsWith(CodeStreamTempPath) ?? false);

		/// <summary>
		/// A case-insensitive Uri comparer
		/// </summary>
		/// <param name="src"></param>
		/// <param name="target"></param>
		/// <returns></returns>
		public static bool EqualsIgnoreCase(this Uri src, Uri target) 
		{ 
			if (src == null && target == null)
			{
				return true;
			}

			if (src == null)
			{
				return false;
			}

			if (target == null)
			{
				return false;
			}

			return Uri.UnescapeDataString(src.ToString()).EqualsIgnoreCase(Uri.UnescapeDataString(target.ToString()));
		}
		/// <summary>
		/// Parses a string version of a uri into a Uri
		/// </summary>
		/// <param name="uriString"></param>
		/// <param name="uriKind"></param>
		/// <returns></returns>
		public static Uri ToUri(this string uriString, UriKind uriKind = UriKind.Absolute) 
		{
			if (uriString.IsNullOrWhiteSpace())
			{
				return null;
			}

			return Uri.TryCreate(Uri.UnescapeDataString(uriString), uriKind, out var result) ? result : null;
		}
		/// <summary>
		/// Returns the name of the file from an absolute Uri
		/// </summary>
		/// <param name="uri"></param>
		/// <returns></returns>
		public static string ToFileName(this Uri uri) {
			try {
				return new FileInfo(uri.AbsolutePath).Name;
			}
			catch {
				return null;
			}
		}
	}
}
