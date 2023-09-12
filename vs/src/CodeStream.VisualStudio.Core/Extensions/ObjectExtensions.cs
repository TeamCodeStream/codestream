using System;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public static class ObjectExtensions
	{
		public static int ToInt(this double o) => Convert.ToInt32(o);

		public static int ToIntSafe(this object s, int defaultValue)
		{
			return s == null ? defaultValue : s.ToString().ToIntSafe(defaultValue);
		}

		public static int ToIntSafe(this string s, int defaultValue)
		{
			if (s.IsNullOrWhiteSpace())
				return defaultValue;

			if (int.TryParse(s, out int i))
			{
				return i;
			}

			return defaultValue;
		}

		public static bool AsBool(this object obj)
		{
			try
			{
				return obj != null && Convert.ToBoolean(obj);
			}
			catch
			{
				return false;
			}
		}
	}
}
