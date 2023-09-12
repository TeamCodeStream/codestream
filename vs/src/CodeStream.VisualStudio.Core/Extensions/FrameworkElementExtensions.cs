using System.Windows;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public static class FrameworkElementExtensions
	{
		/// <summary>
		/// Hides the framework element if it currently visible
		/// </summary>
		/// <param name="frameworkElement"></param>
		/// <returns></returns>
		public static bool TryHide(this FrameworkElement frameworkElement)
		{
			if (frameworkElement.Visibility != Visibility.Visible)
				return false;

			frameworkElement.Visibility = Visibility.Collapsed;
			return true;
		}

		/// <summary>
		/// Shows the framework element if it is not currently visible
		/// </summary>
		/// <param name="frameworkElement"></param>
		/// <returns></returns>
		public static bool TryShow(this FrameworkElement frameworkElement)
		{
			if (frameworkElement.Visibility == Visibility.Visible)
				return false;

			frameworkElement.Visibility = Visibility.Visible;
			return true;
		}
	}
}
