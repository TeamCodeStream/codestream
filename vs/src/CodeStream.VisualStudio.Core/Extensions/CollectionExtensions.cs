using System.Collections.Concurrent;

namespace CodeStream.VisualStudio.Core.Extensions {
	public static class CollectionExtensions {
		public static void ClearAll<T>(this BlockingCollection<T> blockingCollection) {
			if (blockingCollection == null) return;

			while (blockingCollection.Count > 0) {
				T item;
				blockingCollection.TryTake(out item);
			}
		}
	}
}
