using System.Drawing;
using System.Globalization;
using System.Threading;
using CodeStream.VisualStudio.Core.Extensions;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Extensions
{
	public class ColorExtensionsTest
	{
		[Fact]
		public void ToRgbaTest()
		{
			CultureInfo currentCulture = null;
			try
			{
				currentCulture = Thread.CurrentThread.CurrentCulture;
				var culture = new CultureInfo("ru-RU");

				CultureInfo.DefaultThreadCurrentCulture = culture;
				CultureInfo.DefaultThreadCurrentUICulture = culture;

				Assert.Equal("ru-RU", CultureInfo.DefaultThreadCurrentCulture.ToString());
				Assert.Equal(
					"rgba(255, 0, 0, 0.392156862745098)",
					Color.FromArgb(100, 255, 0, 0).ToRgba()
				);
			}
			finally
			{
				CultureInfo.DefaultThreadCurrentCulture = currentCulture;
				CultureInfo.DefaultThreadCurrentUICulture = currentCulture;

				Assert.NotEqual("ru-RU", currentCulture.ToString());
			}
		}
	}
}
