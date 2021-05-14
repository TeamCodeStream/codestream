using System;

namespace CodeStream.VisualStudio.Core.Extensions {
	public static class DateTimeExtensions {
		public static DateTime FromLong(this long l) {
			return new DateTime(1970, 01, 01).AddMilliseconds(l);
		}

		/// <summary>
		/// Converts a local time to human readable words
		/// </summary>
		/// <param name="dateTime"></param>
		public static string TimeAgo(this DateTime dateTime) {
			var timeSpan = DateTime.Now.Subtract(dateTime);

			if (timeSpan <= TimeSpan.FromSeconds(60)) return $"{timeSpan.Seconds} seconds ago";
			if (timeSpan <= TimeSpan.FromMinutes(60)) return timeSpan.Minutes > 1 ? $"about {timeSpan.Minutes} minutes ago" : "about a minute ago";
			if (timeSpan <= TimeSpan.FromHours(24)) return timeSpan.Hours > 1 ? $"about {timeSpan.Hours} hours ago" : "about an hour ago";
			if (timeSpan <= TimeSpan.FromDays(30)) return timeSpan.Days > 1 ? $"about {timeSpan.Days} days ago" : "yesterday";
			if (timeSpan <= TimeSpan.FromDays(365)) return timeSpan.Days > 30 ? $"about {timeSpan.Days / 30} months ago" : "about a month ago";
			return timeSpan.Days > 365 ? $"about {timeSpan.Days / 365} years ago" : "about a year ago";
		}

		public static string ToDisplayDate(this DateTime dt) {
			return string.Format("{0:MMMM d}{1}, {0:yyyy hh:mmtt}", dt, GetDaySuffix(dt.Day));
		}

		private static string GetDaySuffix(int day) {
			switch (day) {
				case 1:
				case 21:
				case 31:
					return "st";
				case 2:
				case 22:
					return "nd";
				case 3:
				case 23:
					return "rd";
				default:
					return "th";
			}
		}
	}
}
