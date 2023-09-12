using System.Collections.Generic;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Shared.Extensions
{
	public static class RangeExtensions
	{
		/// <summary>
		/// Collapses a list of ranges into the most compact set of ranges possible
		/// </summary>
		/// <param name="ranges"></param>
		/// <returns></returns>
		internal static List<Range> Collapsed(this List<Range> ranges)
		{
			if (!ranges.AnySafe())
				return new List<Range>();

			var results = new List<Range>();
			var bufferStart = -1;
			var previousEnd = 0;

			foreach (var range in ranges)
			{
				if (bufferStart == -1 && range.Start.Line == range.End.Line)
				{
					bufferStart = range.Start.Line;
				}
				else if (range.Start.Line != range.End.Line)
				{
					if (bufferStart != -1)
					{
						results.Add(
							new Range
							{
								Start = new Position(bufferStart, 0),
								End = new Position(previousEnd, 0)
							}
						);
						bufferStart = -1;
					}
					results.Add(
						new Range
						{
							Start = new Position(range.Start.Line, 0),
							End = new Position(range.End.Line, 0)
						}
					);
				}

				previousEnd = range.End.Line;
			}

			if (bufferStart != -1)
			{
				results.Add(
					new Range
					{
						Start = new Position(bufferStart, 0),
						End = new Position(previousEnd, 0)
					}
				);
			}

			return results;
		}

		public static List<Range> ToVisibleRanges(this List<Range> ranges) => ranges.Collapsed();

		/// <summary>
		/// Changes a 1,0,2,0 to 1,0,1,int.Max where that equals startLine, startChar, endLine, endChar
		/// </summary>
		/// <param name="range"></param>
		/// <returns></returns>
		public static Range Normalize(this Range range)
		{
			if (range.Start.Line == range.End.Line - 1 && range.End.Character == 0)
			{
				return new Range
				{
					Start = new Position(range.Start.Line, range.Start.Character),
					End = new Position(range.Start.Line, int.MaxValue)
				};
			}

			return new Range
			{
				Start = new Position(range.Start.Line, range.Start.Character),
				End = new Position(range.End.Line, range.End.Character)
			};
		}

		public static bool IsPoint(this Range range)
		{
			return range.Start.AreEqual(range.End);
		}

		private static bool AreEqual(this Position position1, Position position2)
		{
			return position1.Line == position2.Line && position1.Character == position2.Character;
		}

		public static Range AsEmpty(this Range range)
		{
			range.Start = new Position(0, 0);
			range.End = new Position(0, 0);
			return range;
		}
	}
}
