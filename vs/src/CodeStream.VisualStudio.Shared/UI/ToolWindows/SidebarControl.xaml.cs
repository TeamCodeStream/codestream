using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using Microsoft;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.Threading.Tasks;
using System.Windows.Controls;

using CodeStream.VisualStudio.Shared.Authentication;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.UI.ToolWindows
{
	// ReSharper disable once RedundantExtendsListEntry
	// ReSharper disable once ClassWithVirtualMembersNeverInherited.Global
	public partial class SidebarControl : UserControl, IDisposable
	{
		private static readonly ILogger Log = LogManager.ForContext<SidebarControl>();

		private readonly IComponentModel _componentModel;
		private readonly IEventAggregator _eventAggregator;
		private readonly IBrowserService _browserService;
		private readonly ISessionService _sessionService;
		private IDisposable _languageServerDisconnectedEvent;

		private IDisposable _languageServerReadyEvent;
		private bool _disposed = false;
		private bool _isInitialized;
		private static readonly object InitializeLock = new object();

		/// <summary>
		/// Initializes a new instance of the <see cref="SidebarControl"/> class.
		/// </summary>
		public SidebarControl()
		{
			try
			{
				using (Log.CriticalOperation($"ctor", Serilog.Events.LogEventLevel.Debug))
				{
					this.IsVisibleChanged += WebViewControl_IsVisibleChanged;

					InitializeComponent();

					_componentModel =
						Package.GetGlobalService(typeof(SComponentModel)) as IComponentModel;
					Assumes.Present(_componentModel);

					_eventAggregator = _componentModel.GetService<IEventAggregator>();
					_sessionService = _componentModel.GetService<ISessionService>();
					_browserService = _componentModel.GetService<IBrowserService>();

					_ = _browserService
						.InitializeAsync()
						.ContinueWith(
							_ =>
							{
								ThreadHelper.JoinableTaskFactory.Run(
									async delegate
									{
										await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
										// requires UI thread
										_browserService.AttachControl(Grid);
										_browserService.LoadSplashView();
										_languageServerDisconnectedEvent = _eventAggregator
											?.GetEvent<LanguageServerDisconnectedEvent>()
											.Subscribe(e =>
											{
												Log.Debug(
													$"{nameof(LanguageServerDisconnectedEvent)} IsReloading={e?.IsReloading}"
												);

												// if we're in the process of reloading the agent, don't show the splash screen
												if (e.IsReloading)
												{
													return;
												}

												_browserService.LoadSplashView();
											});

										SetupInitialization();
									}
								);
							},
							TaskScheduler.Default
						);
				}
			}
			catch (Exception ex)
			{
				Log.Fatal(ex.UnwrapCompositionException(), nameof(SidebarControl));
			}
		}

		private void WebViewControl_IsVisibleChanged(
			object sender,
			System.Windows.DependencyPropertyChangedEventArgs e
		)
		{
			var newValue = e.NewValue.AsBool();
			_sessionService.IsWebViewVisible = newValue;

			if (!_sessionService.IsReady)
			{
				return;
			}

			if (!newValue && e.OldValue.AsBool())
			{
				//if is going to hide and the last view IS codemarks for file -- enable it
				if (!_sessionService.AreMarkerGlyphsVisible)
				{
					_sessionService.AreMarkerGlyphsVisible = true;
					_eventAggregator.Publish(new MarkerGlyphVisibilityEvent { IsVisible = true });
				}
			}
			else if (newValue && !e.OldValue.AsBool())
			{
				//if is going to show and the last view is NOT codemarks for file
				var areMarkerGlyphsVisible = !_sessionService.IsCodemarksForFileVisible;
				if (areMarkerGlyphsVisible != _sessionService.AreMarkerGlyphsVisible)
				{
					_sessionService.AreMarkerGlyphsVisible = areMarkerGlyphsVisible;
					_eventAggregator.Publish(
						new MarkerGlyphVisibilityEvent { IsVisible = areMarkerGlyphsVisible }
					);
					if (_sessionService.LastActiveFileUri != null)
					{
						try
						{
							_componentModel
								?.GetService<ICodeStreamService>()
								?.ChangeActiveEditorAsync(_sessionService.LastActiveFileUri);
						}
						catch (Exception ex)
						{
							Log.Warning(ex, nameof(WebViewControl_IsVisibleChanged));
						}
					}
				}
			}
		}

		private void SetupInitialization()
		{
			Log.Debug($"{nameof(SetupInitialization)} IsAgentReady={_sessionService.IsAgentReady}");
			if (_languageServerReadyEvent == null)
			{
				Log.Debug(
					$"{nameof(SetupInitialization)} Setting up {nameof(LanguageServerReadyEvent)} event"
				);
				// ReSharper disable once PossibleNullReferenceException
				_languageServerReadyEvent = _eventAggregator
					.GetEvent<LanguageServerReadyEvent>()
					.Subscribe(_ =>
					{
						Log.Debug(
							$"{nameof(LanguageServerReadyEvent)} Received, calling {nameof(InitializeCore)}"
						);
						InitializeCore();
						_browserService.LoadWebView();
					});
			}

			if (_sessionService.IsAgentReady)
			{
				Log.Debug($"Calling {nameof(InitializeCore)}");
				InitializeCore();
				_browserService.LoadWebView();
			}
		}

		private void InitializeCore()
		{
			// ReSharper disable InvertIf
			if (!_isInitialized)
			{
				lock (InitializeLock)
				{
					if (!_isInitialized)
					{
						try
						{
							using (
								Log.CriticalOperation(
									nameof(InitializeCore),
									Serilog.Events.LogEventLevel.Debug
								)
							)
							{
								var router = new SidebarRouter(
									_componentModel,
									_componentModel.GetService<ICodeStreamService>(),
									_componentModel.GetService<IWebviewUserSettingsService>(),
									_componentModel.GetService<ISessionService>(),
									_componentModel.GetService<ICodeStreamAgentService>(),
									_componentModel.GetService<ISettingsServiceFactory>(),
									_eventAggregator,
									_browserService,
									_componentModel.GetService<IIdeService>(),
									_componentModel.GetService<IEditorService>(),
									_componentModel.GetService<IAuthenticationServiceFactory>(),
									_componentModel.GetService<IMessageInterceptorService>(),
									_componentModel.GetService<ICredentialManager>(),
									_componentModel.GetService<ISymbolService>()
								);

								_browserService.AddWindowMessageEvent(
									async delegate(object sender, WindowEventArgs ea)
									{
										await router.HandleAsync(ea);
									}
								);

								_isInitialized = true;
							}
						}
						catch (Exception ex)
						{
							Log.Fatal(ex, nameof(InitializeCore));
						}
					}
				}
			}
			// ReSharper restore InvertIf
		}

		public void Dispose()
		{
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing)
		{
			if (_disposed)
			{
				return;
			}

			if (disposing)
			{
				_languageServerReadyEvent?.Dispose();
				_languageServerDisconnectedEvent?.Dispose();
				IsVisibleChanged -= WebViewControl_IsVisibleChanged;
			}

			_disposed = true;
		}
	}
}
