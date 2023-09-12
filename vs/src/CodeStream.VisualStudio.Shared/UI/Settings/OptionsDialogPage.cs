using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Runtime.CompilerServices;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;

using System.Runtime.InteropServices;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.UI.Settings
{
	[ComVisible(true)]
	public class OptionsDialogPage : Microsoft.VisualStudio.Shell.DialogPage, IOptionsDialogPage
	{
		private string _email;
		private string _team;
		private bool _autoSignIn = true;
		private bool _showMarkerGlyphs = true;
		private TraceLevel _traceLevel = TraceLevel.Info;

#if DEBUG
		private string _serverUrl = "https://codestream-pd.staging-service.nr-ops.net";
#else
		private string _serverUrl = "https://codestream-us1.service.newrelic.com";
#endif
		private bool _disableStrictSsl;
		private bool _proxyStrictSsl;
		private string _extraCertificates;
		private ProxySupport _proxySupport;

		private bool _showContextMenuCommands = true;

		public event PropertyChangedEventHandler PropertyChanged;

		public OptionsDialogPage()
		{
			ProxySetup();
		}

		[Browsable(false)]
		public Proxy Proxy { get; private set; }

		[Browsable(false)]
		public bool PauseNotifyPropertyChanged { get; set; }

		private void NotifyPropertyChanged([CallerMemberName] string propertyName = "")
		{
			if (PauseNotifyPropertyChanged)
			{
				return;
			}

			PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
		}

		private void ProxySetup()
		{
			if (ProxySupport == ProxySupport.Off)
			{
				return;
			}

			try
			{
				var webProxy = WebRequest.GetSystemWebProxy();
				var serverUri = new Uri(ServerUrl);
				var possibleProxyUri = webProxy.GetProxy(new Uri(ServerUrl));

				if (!possibleProxyUri.EqualsIgnoreCase(serverUri))
				{
					// has a system proxy
					Proxy = new Proxy
					{
						Url = possibleProxyUri.ToString(),
						StrictSSL = ProxyStrictSsl
					};
				}
			}
			catch
			{
				// suffer silently
			}
		}

		[Category("Authentication")]
		[DisplayName("Email")]
		[Description("Specifies the email address to use to connect to the CodeStream service")]
		public string Email
		{
			get => _email;
			set
			{
				if (_email != value)
				{
					_email = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Authentication")]
		[DisplayName("Team")]
		[Description("Specifies the team to use to connect to the CodeStream service")]
		public string Team
		{
			get => _team;
			set
			{
				if (_team != value)
				{
					_team = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Authentication")]
		[DisplayName("Auto Sign In")]
		[Description("Specifies whether to automatically sign in to CodeStream")]
		public bool AutoSignIn
		{
			get => _autoSignIn;
			set
			{
				if (_autoSignIn != value)
				{
					_autoSignIn = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Server Url")]
		[Description("Specifies the url to use to connect to the CodeStream service")]
		public string ServerUrl
		{
			get => _serverUrl;
			set
			{
				value = value?.TrimEnd('/');
				if (_serverUrl != value)
				{
					_serverUrl = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Proxy Strict SSL")]
		[Description(
			"Specifies where the proxy server certificate should be verified against the list of supplied CAs"
		)]
		public bool ProxyStrictSsl
		{
			get => _proxyStrictSsl;
			set
			{
				if (_proxyStrictSsl != value)
				{
					_proxyStrictSsl = value;
					ProxySetup();
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Proxy Support")]
		[Description(
			"Specifies how proxies are handled. [On] Your system-level proxy will be used, if set. [Off] No support."
		)]
		public ProxySupport ProxySupport
		{
			get => _proxySupport;
			set
			{
				if (_proxySupport != value)
				{
					_proxySupport = value;
					ProxySetup();
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Disable Strict SSL")]
		[Description("Allow self-signed certificates to be used in network requests")]
		public bool DisableStrictSSL
		{
			get => _disableStrictSsl;
			set
			{
				if (_disableStrictSsl != value)
				{
					_disableStrictSsl = value;

					NotifyPropertyChanged();
				}
			}
		}

		[Category("Connectivity")]
		[DisplayName("Extra Certificates")]
		[Description(
			"Specify path to file containing any certificate(s) you wish CodeStream connections to trust"
		)]
		public string ExtraCertificates
		{
			get => _extraCertificates;
			set
			{
				if (_extraCertificates != value)
				{
					_extraCertificates = value;

					NotifyPropertyChanged();
				}
			}
		}

		[Category("UI")]
		[DisplayName("Show Marker Glyphs")]
		[Description(
			"Specifies whether to show glyph indicators at the start of lines with associated codemarks in the editor"
		)]
		public bool ShowMarkerGlyphs
		{
			get => _showMarkerGlyphs;
			set
			{
				if (_showMarkerGlyphs != value)
				{
					_showMarkerGlyphs = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("UI")]
		[DisplayName("Show Context Menu Commands")]
		[Description("Specifies whether to show commands on the right-click context-menu")]
		public bool ShowContextMenuCommands
		{
			get => _showContextMenuCommands;
			set
			{
				if (_showContextMenuCommands != value)
				{
					_showContextMenuCommands = value;
					NotifyPropertyChanged();
				}
			}
		}

		[Category("Other")]
		[DisplayName("Trace Level")]
		[Description("Specifies how much (if any) output will be sent to the CodeStream log")]
		public TraceLevel TraceLevel
		{
			get { return _traceLevel; }
			set
			{
				if (_traceLevel != value)
				{
					_traceLevel = value;
					NotifyPropertyChanged();
				}
			}
		}
	}
}
