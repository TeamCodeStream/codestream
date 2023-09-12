using System;
using System.Reactive.Linq;

namespace CodeStream.VisualStudio.Core.Extensions
{
	public static class ReactiveExtensions
	{
		public static IObservable<T> ObserveOnApplicationDispatcher<T>(
			this IObservable<T> observable
		)
		{
			if (
				System.Windows.Application.Current == null
				|| System.Windows.Application.Current.Dispatcher == null
			)
				return null;

			return observable?.ObserveOn(System.Windows.Application.Current.Dispatcher);
		}
	}
}
