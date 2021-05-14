using System;
using System.Drawing;
using System.Globalization;

namespace CodeStream.VisualStudio.Core.Extensions {
	public static class ColorExtensions {
		public static System.Windows.Media.Color ConvertToMediaColor(this System.Drawing.Color color) {
			return System.Windows.Media.Color.FromArgb(color.A, color.R, color.G, color.B);
		}

		public static string ToRgba(this Color color) {
			// in a non en-US locale, the division may create a comma instead of a period. guard against that with InvariantCulture.
			return $"rgba({color.R}, {color.G}, {color.B}, {((double)color.A / 255).ToString(CultureInfo.InvariantCulture)})";
		}

		public static float Lerp(this float start, float end, float amount) {
			float difference = end - start;
			float adjusted = difference * amount;
			return start + adjusted;
		}

		public static Color Lerp(this Color color, Color to, float amount) {			
			float sr = color.R;
			float sg = color.G;
			float sb = color.B;	 	 
			
			return Color.FromArgb((byte)sr.Lerp(to.R, amount), (byte)sg.Lerp(to.G, amount), (byte)sb.Lerp(to.B, amount));
		}		

		/// <summary>
		/// Darken a color
		/// </summary>
		/// <param name="color"></param>
		/// <param name="rate">0.1f == 10%</param>
		/// <param name="darker"></param>
		/// <returns></returns>
		public static Color Darken(this Color color, float rate = 0.1f, Color? darker = null) {
			return color.Lerp(darker ?? Color.Black, rate);
		}

		/// <summary>
		/// Lighten a color
		/// </summary>
		/// <param name="color"></param>
		/// <param name="rate">0.1f == 10%</param>
		/// <param name="lighter"></param>
		/// <returns></returns>
		public static Color Lighten(this Color color, float rate = 0.1f, Color? lighter = null) {
			return color.Lerp(lighter ?? Color.White, rate);
		}

		public static Color Opacity(this Color color, double percentage = 100) {
			return Color.FromArgb(Convert.ToInt32(255 * (color.A / 255 * percentage / 100)), color);
		}

		/// <summary>
		/// Returns whether a color is closer to black rather than white
		/// </summary>
		/// <param name="c2"></param>
		public static bool IsDark(this Color c2) => (0.2126 * c2.R + 0.7152 * c2.G + 0.0722 * c2.B) < 128;
	}
}
