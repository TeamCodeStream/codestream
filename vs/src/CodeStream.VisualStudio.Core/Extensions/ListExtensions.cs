using System;
using System.Collections.Generic;
using System.Linq;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public class ListExtensionsDummy { }

	public static class ListExtensions
	{
		public static void AddMany<T>(this List<T> list, params T[] t)
		{
			list.AddRange(t);
		}

		/// <summary>
		/// Combines the items from list a and list b into a new list (c);
		/// </summary>
		/// <typeparam name="T"></typeparam>
		/// <param name="a"></param>
		/// <param name="b"></param>
		/// <returns></returns>
		public static List<T> Combine<T>(this List<T> a, List<T> b)
		{
			var c = new List<T>();

			c.AddRange(a);
			c.AddRange(b);

			return c;
		}

		public static bool AnySafe<T>(this List<T> list) => list != null && list.Any();

		public static void DisposeAll(this List<IDisposable> disposables)
		{
			if (!disposables.AnySafe())
				return;

			foreach (IDisposable disposable in disposables)
			{
				disposable?.Dispose();
			}
		}
	}
}
