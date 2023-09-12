using System;
using System.Linq;

namespace CodeStream.VisualStudio.Shared.LanguageServer
{
	public static class Extensions
	{
		/// <summary>
		/// Converts a URI-like string into a lower-cased drive lettered, colon-encoded URI-like string,
		/// with a file:/// protocol
		/// </summary>
		/// <param name="filePath"></param>
		/// <returns></returns>
		public static string ToLspUriString(this string filePath)
		{
			var split = filePath.Split(new[] { '\\' });

			var driveLetter = split[0];
			if (driveLetter.Length != 2 || !driveLetter.EndsWith(":"))
			{
				return null;
			}

			return "file:///"
				+ driveLetter.ToLowerInvariant().Replace(":", Uri.EscapeDataString(":"))
				+ "/"
				+ string.Join("/", split.ToList().Skip(1));
		}
	}
}
