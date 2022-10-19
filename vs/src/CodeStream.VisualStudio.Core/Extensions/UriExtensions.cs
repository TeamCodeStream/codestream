using System;
using System.IO;

namespace CodeStream.VisualStudio.Core.Extensions 
{
	public static class UriExtensions
	{
		public static string NormalizePath(this string path) 
			=> NormalizePath(new Uri(path));

		public static string NormalizePath(this Uri path) 
			=> 	Path.GetFullPath(
					path.LocalPath
						.TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
						.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
						.ToLowerInvariant()
				);

		private static string TempPath 
			=> NormalizePath(Path.GetTempPath());

		public static bool IsTempFile(this string filePath) 
			=> !string.IsNullOrEmpty(filePath) 
			   && new Uri(filePath).IsTempFile();

		public static bool IsDiffFile(this string filePath) 
			=> !string.IsNullOrEmpty(filePath) 
			   && new Uri(filePath).IsDiffFile();

		public static bool IsTempFile(this Uri filePath) 
			=> filePath != null
			   && filePath.IsFile 
			   && (NormalizePath(filePath.ToString())?.StartsWith(TempPath) ?? false);

		public static bool IsDiffFile(this Uri filePath) 
			=> filePath != null
			   && filePath.Scheme.EqualsIgnoreCase("codestream-diff");


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
		/// Local path seems to return a string like /c:/foo, this strips the leading forward slash
		/// </summary>
		/// <param name="uri"></param>
		/// <returns></returns>
		public static string ToLocalPath(this Uri uri) => uri.LocalPath.TrimStart('/');

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
