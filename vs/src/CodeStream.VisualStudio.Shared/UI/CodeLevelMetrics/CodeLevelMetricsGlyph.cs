using System;
using System.IO;

using Microsoft.VisualStudio.Text.Editor;

using System.Windows.Media.Imaging;
using System.Reflection;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	public class CodeLevelMetricsGlyph : IGlyphTag
	{
		public BitmapSource Icon { get; }
		public string Tooltip { get; }

		public CodeLevelMetricsGlyph(string tooltip)
		{
			var assembly = Assembly.GetAssembly(typeof(CodeLevelMetricsGlyphFactory));
			Icon = LoadImageFromFile(assembly);
			Tooltip = tooltip;
		}

		private static BitmapSource LoadImageFromFile(Assembly assembly)
		{
			var bitmapImage = new BitmapImage();

			bitmapImage.BeginInit();
			bitmapImage.UriSource = new Uri(
				Path.GetDirectoryName(assembly.Location)
					+ "/resources/assets/new-relic-logo-small-red.png",
				UriKind.Absolute
			);
			bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
			bitmapImage.EndInit();

			return bitmapImage;
		}
	}
}
