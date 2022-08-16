using System;
using System.Collections.Generic;
using System.Linq;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Extensions;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Core.Extensions {
	public static class TextViewExtensions {
		public static void RemovePropertySafe(this PropertyCollection collection, string key) {
			if (key.IsNullOrWhiteSpace() || !collection.ContainsProperty(key)) return;

			collection.RemoveProperty(key);
		}

		public static bool TryDisposeProperty<T>(this PropertyCollection collection, string key, bool removeProperty = true)
		where T : IDisposable {
			if (!collection.ContainsProperty(key)) return false;

			var property = collection.GetProperty<T>(key);
			property?.Dispose();
			;
			if (removeProperty) {
				collection.RemoveProperty(key);
			}

			return true;
		}

		public static bool TryDisposeListProperty(this PropertyCollection collection, string key, bool removeProperty = true) {
			if (!collection.ContainsProperty(key)) return false;

			collection.GetProperty<List<IDisposable>>(key)?.DisposeAll();
			if (removeProperty) {
				collection.RemoveProperty(key);
			}

			return true;
		}

		public static List<Range> ToRanges(this IWpfTextViewLineCollection lines) {
			return lines.Select(line => new Range { Start = new Position(line.Start.GetContainingLine().LineNumber, 0), End = new Position(line.End.GetContainingLine().LineNumber, 0) }).ToList();
		}

		public static List<Range> ToVisibleRangesSafe(this IWpfTextView textView) {
			if (textView == null) return Enumerable.Empty<Range>().ToList();
			try {
				return textView.TextViewLines.ToRanges().Collapsed();
			}
			catch {
				return Enumerable.Empty<Range>().ToList();
			}
		}

		public static Placement GetGeometryPlacement(this IWpfTextView textView, SnapshotSpan span) {
			var viewportWidth = textView.ViewportWidth;
			var g = textView.TextViewLines.GetMarkerGeometry(span);
			if (g == null) return new Placement(0, viewportWidth);

			var width = g.Bounds.Width > viewportWidth || Math.Abs(g.Bounds.Width) < 0.0001
				? viewportWidth : g.Bounds.Width;

			return new Placement(g.Bounds.Left, width);
		}
	}
}
