using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface IThemeEventsListener
	{
		event EventHandler<ThemeChangedEventArgs> ThemeChangedEventHandler;
	}

	[Export(typeof(IThemeEventsListener))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public sealed class ThemeEventsListener : IThemeEventsListener, IDisposable
	{
		private static readonly ILogger Log = LogManager.ForContext<ThemeEventsListener>();
		private bool _disposed;

		[ImportingConstructor]
		public ThemeEventsListener(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider
		)
		{
			VSColorTheme.ThemeChanged += VSColorTheme_ThemeChanged;
		}

		private DateTime _lastThemeChange = DateTime.MinValue;

		public event EventHandler<ThemeChangedEventArgs> ThemeChangedEventHandler;

		private void VSColorTheme_ThemeChanged(ThemeChangedEventArgs e)
		{
			// VS triggers this like 5 times for ever _1_ change -- try to limit it
			var now = DateTime.Now;
			if (_lastThemeChange == DateTime.MinValue || (now - _lastThemeChange).Seconds > 2)
			{
				ThemeChangedEventHandler?.Invoke(this, e);
				_lastThemeChange = now;
			}
		}

		private void Dispose(bool disposing)
		{
			if (_disposed)
				return;

			if (disposing)
			{
				try
				{
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					VSColorTheme.ThemeChanged -= VSColorTheme_ThemeChanged;

					_disposed = true;
					Log.Verbose($"Unregistering events");
				}
				catch (Exception ex)
				{
					Log.Error(ex, nameof(Dispose));
				}
			}
		}

		public void Dispose()
		{
			try
			{
				ThreadHelper.ThrowIfNotOnUIThread();
				Dispose(true);
				GC.SuppressFinalize(this);
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(Dispose));
			}
		}
	}
}
