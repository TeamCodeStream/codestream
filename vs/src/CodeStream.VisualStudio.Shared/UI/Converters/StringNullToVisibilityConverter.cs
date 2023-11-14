using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace CodeStream.VisualStudio.Shared.UI.Converters
{
	public class StringNullToVisibilityConverter : IValueConverter
	{
		public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
		{
			switch (value)
			{
				case null:
					return Visibility.Collapsed;
				case string objValue:
					return string.IsNullOrEmpty(objValue)
						? Visibility.Collapsed
						: Visibility.Visible;
				default:
					return Visibility.Visible;
			}
		}

		public object ConvertBack(
			object value,
			Type targetType,
			object parameter,
			CultureInfo culture
		) => throw new NotImplementedException();
	}
}
