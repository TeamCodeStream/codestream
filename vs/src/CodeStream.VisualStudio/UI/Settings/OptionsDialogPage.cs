using System;
using System.ComponentModel;
using System.Net;
using System.Runtime.CompilerServices;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.UI.Settings {
	public class OptionsDialogPage : Microsoft.VisualStudio.Shell.DialogPage, IOptionsDialogPage {	

		private string _email;
		private bool _autoHideMarkers = false;
		//// not supported yet
		//private bool _showMarkerCodeLens = false;
		private bool _showMarkerGlyphs = true;
		private bool _showAvatars = true;
		private TraceLevel _traceLevel = TraceLevel.Info;
		 
		private string _team;
		private bool _autoSignIn = true;
#if DEBUG
		private string _serverUrl = "https://pd-api.codestream.us";
#else
        private string _serverUrl = "https://api.codestream.com";
#endif
		private bool _disableStrictSsl = false;
		private bool _proxyStrictSsl;
		private string _extraCertificates;

		private string _goldenSignalsInEditorFormat =
			"avg duration: ${averageDuration} | throughput: ${throughput} | error rate: ${errorsPerMinute} - since ${since}";

		private ProxySupport _proxySupport;

		public event PropertyChangedEventHandler PropertyChanged;

		public OptionsDialogPage() {
			ProxySetup();
		}

		[Browsable(false)]
		public Proxy Proxy { get; private set; }

		[Browsable(false)]
		public bool PauseNotifyPropertyChanged { get; set; }

		private void NotifyPropertyChanged([CallerMemberName] string propertyName = "") {
			if (PauseNotifyPropertyChanged) return;

			PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
		}

		private void ProxySetup() {
			if (ProxySupport == ProxySupport.Off) return;

			try {
				var webProxy = WebRequest.GetSystemWebProxy();
				var serverUri = new Uri(ServerUrl);
				var possibleProxyUri = webProxy.GetProxy(new Uri(ServerUrl));

				if (!possibleProxyUri.EqualsIgnoreCase(serverUri)) {
					// has a system proxy
					Proxy = new Proxy {
						Url = possibleProxyUri.ToString(),
						StrictSSL = ProxyStrictSsl
					};
				}
			}
			catch {
				// suffer silently
			}
		}

		[Category("Authentication")]
		[DisplayName("Email")]
		[Description("Specifies the email address to use to connect to the CodeStream service")]
		public string Email {
			get => _email;
			set {
				if (_email != value) {
					_email = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Authentication")]
		[DisplayName("Auto Sign In")]
		[Description("Specifies whether to automatically sign in to CodeStream")]
		public bool AutoSignIn {
			get => _autoSignIn;
			set {
				if (_autoSignIn != value) {
					_autoSignIn = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Server Url")]
		[Description("Specifies the url to use to connect to the CodeStream service")]
		public string ServerUrl {
			get => _serverUrl;
			set {
				if (_serverUrl != value) {
					_serverUrl = value;
					NotifyPropertyChanged();
				}
			}
		}


		[Category("Connectivity")]
		[DisplayName("Proxy Strict SSL")]
		[Description("Specifies where the proxy server certificate should be verified against the list of supplied CAs")]
		public bool ProxyStrictSsl {
			get => _proxyStrictSsl;
			set {
				if (_proxyStrictSsl != value) {
					_proxyStrictSsl = value;
					ProxySetup();
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Proxy Support")]
		[Description("Specifies how proxies are handled. [On] Your system-level proxy will be used, if set. [Off] No support.")]
		public ProxySupport ProxySupport {
			get => _proxySupport;
			set {
				if (_proxySupport != value) {
					_proxySupport = value;
					ProxySetup();
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Disable Strict SSL")]
		[Description("Allow self-signed certificates to be used in network requests")]
		public bool DisableStrictSSL {
			get => _disableStrictSsl;
			set {
				if (_disableStrictSsl != value) {
					_disableStrictSsl = value;
					 
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Extra Certificates")]
		[Description("Specify path to file containing any certificate(s) you wish CodeStream connections to trust")]
		public string ExtraCertificates {
			get => _extraCertificates;
			set {
				if (_extraCertificates != value) {
					_extraCertificates = value;

					NotifyPropertyChanged();
				}
			}
		}

		[Category("UI")]
		[DisplayName()]
		[Description("Specifies whether to automatically hide editor marker glyphs when the CodeStream panel is showing codemarks in the current file")]
		public bool AutoHideMarkers {
			get => _autoHideMarkers;
			set {
				if (_autoHideMarkers != value) {
					_autoHideMarkers = value;
					NotifyPropertyChanged();
				}
			}
		}

		//[Category("UI")]
		//[DisplayName("Show Marker CodeLens")]
		//[Description("Specifies whether to show code lens above lines with associated codemarks in the editor")]
		//public bool ShowMarkerCodeLens
		//{
		//    get => _showMarkerCodeLens;
		//    set
		//    {
		//        _showMarkerCodeLens = value;
		//        NotifyPropertyChanged();
		//    }
		//}

		[Category("UI")]
		[DisplayName("Show Marker Glyphs")]
		[Description("Specifies whether to show glyph indicators at the start of lines with associated codemarks in the editor")]
		public bool ShowMarkerGlyphs {
			get => _showMarkerGlyphs;
			set {
				if (_showMarkerGlyphs != value) {
					_showMarkerGlyphs = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("UI")]
		[DisplayName("Show Avatars")]
		[Description("Specifies whether to show avatars")]
		public bool ShowAvatars {
			get => _showAvatars;
			set {
				if (_showAvatars != value) {
					_showAvatars = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Other")]
		[DisplayName("Trace Level")]
		[Description("Specifies how much (if any) output will be sent to the CodeStream log")]
		public TraceLevel TraceLevel {
			get { return _traceLevel; }
			set {
				if (_traceLevel != value) {
					_traceLevel = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("UI")]
		[DisplayName("Golden Signals Format")]
		[Description("Specifies how to format the CodeStream golden signals in the editor")]
		public string GoldenSignalsInEditorFormat {
			get => _goldenSignalsInEditorFormat;
			set {
				if (_goldenSignalsInEditorFormat != value) {
					_goldenSignalsInEditorFormat = value;
					NotifyPropertyChanged();
				}
			}
		}
	}
}
