using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Serilog;

namespace CodeStream.VisualStudio.Controllers {
	public class ConfigurationController {
		private static readonly ILogger Log = LogManager.ForContext<ConfigurationController>();

		private readonly IEventAggregator _eventAggregator;
		private readonly IBrowserService _browserService;

		public ConfigurationController(IEventAggregator eventAggregator, IBrowserService browserService) {
			_eventAggregator = eventAggregator;
			_browserService = browserService;
		}

		public void ToggleShowMarkerGlyphs(bool value) {
			_eventAggregator.Publish(new MarkerGlyphVisibilityEvent { IsVisible = value });

			Log.Debug($"{nameof(ToggleShowMarkerGlyphs)} Value={value}");

			_browserService.Notify(new HostDidChangeConfigNotificationType {
				Params = new HostDidChangeConfigNotification {
					ShowMarkerGlyphs = value
				}
			});
		}

		public void ToggleShowAvatars(bool value) {
			Log.Debug($"{nameof(ToggleShowAvatars)} Value={value}");

			_browserService.Notify(new HostDidChangeConfigNotificationType {
				Params = new HostDidChangeConfigNotification {
					ShowHeadshots = value
				}
			});
		}
	}
}
