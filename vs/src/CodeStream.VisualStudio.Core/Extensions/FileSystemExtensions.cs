using System;
using System.IO;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public class FileSystemExtensions
	{
		public class FileLockInfo
		{
			public FileLockInfo(string directoryPath)
			{
				DirectoryPath = directoryPath;
			}

			public FileLockInfo(string directoryPath, string fileName)
			{
				DirectoryPath = directoryPath;
				FileName = fileName;
			}

			public string DirectoryPath { get; }
			public string FileName { get; set; }
			public Exception Exception { get; set; }
			public bool IsLocked { get; set; }
		}

		public class DirectoryLockInfo
		{
			public DirectoryLockInfo(string directoryPath)
			{
				DirectoryPath = directoryPath;
			}

			public string DirectoryPath { get; }
			public string LockFile { get; set; }
			public Exception Exception { get; set; }

			/// <summary>
			/// this directory is either locked with a .lock file marker or a known file holds a lock
			/// </summary>
			public bool HasLocked
			{
				get { return LockFile != null; }
			}
		}

		public static bool TryDeleteFile(string path, out Exception exception)
		{
			try
			{
				new FileInfo(path).Delete();
				exception = null;
				return true;
			}
			catch (Exception ex)
			{
				exception = ex;
			}
			return false;
		}

		public static bool IsFileLocked(string fullFilePath)
		{
			try
			{
				// ReSharper disable once UnusedVariable
				using (
					var fs = new FileStream(
						fullFilePath,
						FileMode.Open,
						FileAccess.Read,
						FileShare.ReadWrite
					)
				)
				{
					// if we got here -- file is not locked
					return false;
				}
			}
			catch (IOException)
			{
				return true;
			}
		}

		public static FileLockInfo HoldsFileLock(string directoryPath, string fileName)
		{
			var result = new FileLockInfo(directoryPath, fileName);
			try
			{
				var di = new DirectoryInfo(directoryPath);
				foreach (var file in di.GetFiles())
				{
					if (file.Name.EqualsIgnoreCase(fileName))
					{
						result.IsLocked = IsFileLocked(file.FullName);
						return result;
					}
				}
			}
			// ReSharper disable once EmptyGeneralCatchClause
			catch (Exception) { }

			return result;
		}
	}
}
