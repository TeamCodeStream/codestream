using System;
using System.ComponentModel;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.UnitTests.Stubs
{
    public class OptionsDialogPageStub : IOptionsDialogPage
    {
        public event PropertyChangedEventHandler PropertyChanged {
	        add { throw new NotSupportedException(); }
	        remove { }
        }

		public string Email { get; set; }        
        public bool ShowAvatars { get; set; }        
        public string ServerUrl { get; set; }
        public void Save() { }
        public void Load() { }

		public void SaveSettingsToStorage() {
			throw new NotImplementedException();
		}

		public void LoadSettingsFromStorage() {
			throw new NotImplementedException();
		}

		public TraceLevel TraceLevel { get; set; }
		public bool PauseNotifyPropertyChanged { get; set; }
		public bool AutoSignIn { get; set; }
        public bool AutoHideMarkers { get; set; }
        public bool ShowMarkerGlyphs { get; set; }
        public bool ProxyStrictSsl { get; set; }
        public string ProxyUrl { get; set; }
        public ProxySupport ProxySupport { get; set; }
        public bool DisableStrictSSL { get; set; }
        public string ExtraCertificates { get; set; }
        public Proxy Proxy { get; }
		public bool ShowGoldenSignalsInEditor { get; set;  }
		public string GoldenSignalsInEditorFormat { get; set; }
	}
}
