using System;
using System.IO;

using Microsoft.VisualStudio.Text.Editor;

using System.Windows.Media.Imaging;
using System.Reflection;

using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.UI.CodeLevelMetrics
{
	public class CodeLevelMetricsGlyph : IGlyphTag
	{
		private readonly Assembly _assembly;
		public BitmapSource Icon { get; }

		public CodeLevelMetricsGlyph()
		{
			_assembly = Assembly.GetAssembly(typeof(CodeLevelMetricsGlyphFactoryProvider));
			Icon = LoadImageFromFile(_assembly);
		}

		private static BitmapSource LoadImageFromFile(Assembly assembly)
		{
			var bitmapImage = new BitmapImage();

			bitmapImage.BeginInit();
			bitmapImage.UriSource = new Uri(
				Path.GetDirectoryName(assembly.Location)
					+ "/resources/assets/new-relic-logo-small.png",
				UriKind.Absolute
			);
			bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
			bitmapImage.EndInit();

			return bitmapImage;
		}
	}
}
