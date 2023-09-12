using System;

namespace CodeStream.VisualStudio.Core
{
	public static class Retry
	{
		/// <summary>
		/// Attempts to run a function {tryCount} times, multipling the attempts by the {sleepIntervalInMilliseconds}
		/// for each iteration if the function does not return true
		/// </summary>
		/// <param name="fn"></param>
		/// <param name="tryCount"></param>
		/// <param name="sleepIntervalInMilliseconds"></param>
		/// <returns></returns>
		public static bool WithExponentialBackoff(
			Func<bool> fn,
			int tryCount = 5,
			int sleepIntervalInMilliseconds = 250
		)
		{
			if (tryCount < 1)
				throw new ArgumentOutOfRangeException(nameof(tryCount));

			for (var i = 1; i < tryCount + 1; i++)
			{
				if (fn())
				{
					return true;
				}
				System.Threading.Thread.Sleep(sleepIntervalInMilliseconds * i);
			}
			return false;
		}
	}
}
