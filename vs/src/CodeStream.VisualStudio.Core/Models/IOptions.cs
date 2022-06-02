using System.ComponentModel;
using CodeStream.VisualStudio.Core.Logging;

namespace CodeStream.VisualStudio.Core.Models {
	public interface IOptions {
		string Email { get; set; }
		bool ShowAvatars { get; set; }
		bool AutoSignIn { get; set; }

		bool AutoHideMarkers { get; set; }
		//bool ShowMarkerCodeLens { get; set; }
		bool ShowMarkerGlyphs { get; set; }

		string ServerUrl { get; set; }
		bool ProxyStrictSsl { get; set; }
		ProxySupport ProxySupport { get; set; }
		bool DisableStrictSSL { get; set; }
		string ExtraCertificates { get; set; }

		string GoldenSignalsInEditorFormat { get; set; }
	}

	public interface IOptionsDialogPage : IOptions, INotifyPropertyChanged {
		Proxy Proxy { get; }
		void SaveSettingsToStorage();
		void LoadSettingsFromStorage();

		TraceLevel TraceLevel { get; set; }
		bool PauseNotifyPropertyChanged { get; set; }
	}
}
