using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Services;
using Microsoft.VisualStudio.Shell;
using Newtonsoft.Json.Linq;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CodeStream.VisualStudio.Core.Controllers {
	public class AuthenticationController {
		private static readonly ILogger Log = LogManager.ForContext<AuthenticationController>();

		private readonly ICodeStreamSettingsManager _codeStreamSettingsManager;
		private readonly ISessionService _sessionService;
		private readonly ICodeStreamAgentService _codeStreamAgent;
		private readonly IEventAggregator _eventAggregator;
		private readonly ICredentialsService _credentialsService;
		private readonly IWebviewUserSettingsService _webviewUserSettingsService;

		public AuthenticationController(
			ICodeStreamSettingsManager codeStreamSettingManager,
			ISessionService sessionService,
			ICodeStreamAgentService codeStreamAgent,
			IEventAggregator eventAggregator,
			ICredentialsService credentialsService,
			IWebviewUserSettingsService webviewUserSettingsService) {
			_codeStreamSettingsManager = codeStreamSettingManager;
			_sessionService = sessionService;
			_codeStreamAgent = codeStreamAgent;
			_eventAggregator = eventAggregator;
			_credentialsService = credentialsService;
			_webviewUserSettingsService = webviewUserSettingsService;
		}

		public AuthenticationController(
			ICodeStreamSettingsManager codeStreamSettingManager,
			ISessionService sessionService,
			IEventAggregator eventAggregator,
			ICredentialsService credentialsService,
			IWebviewUserSettingsService IWebviewUserSettingsService) {
			_codeStreamSettingsManager = codeStreamSettingManager;
			_sessionService = sessionService;
			_eventAggregator = eventAggregator;
			_credentialsService = credentialsService;
			_webviewUserSettingsService = IWebviewUserSettingsService;
		}

		public async Task<bool> TryAutoSignInAsync() {
			try {
				ProcessLoginResponse processResponse = null;

				if (!_codeStreamSettingsManager.AutoSignIn || _codeStreamSettingsManager.Email.IsNullOrWhiteSpace()) {
					Log.Debug("no AutoSignIn or Email is missing");
					return false;
				}

				var token = await _credentialsService.LoadJsonAsync(_codeStreamSettingsManager.ServerUrl.ToUri(), _codeStreamSettingsManager.Email);
				if (token != null) {
					Log.Debug("Attempting to AutoSignIn");
					try {
						var teamId = _webviewUserSettingsService?.TryGetTeamId(_sessionService.SolutionName);
						var loginResponse = await _codeStreamAgent.LoginViaTokenAsync(token, teamId);
						processResponse = ProcessLoginError(loginResponse);
						Log.Debug($"{nameof(processResponse)} Success={processResponse?.Success}");
						if (!processResponse.Success) {
							if (!processResponse.ErrorMessage.IsNullOrWhiteSpace() &&
								Enum.TryParse(processResponse.ErrorMessage, out LoginResult loginResult) && loginResult != LoginResult.VERSION_UNSUPPORTED) {
								await _credentialsService.DeleteAsync(_codeStreamSettingsManager.ServerUrl.ToUri(), _codeStreamSettingsManager.Email);
							}
							return false;
						}
						else {
							return true;
						}
					}
					catch (Exception ex) {
						Log.Warning(ex, $"{nameof(TryAutoSignInAsync)}");
					}
				}
				else {
					Log.Debug("Missing token");
				}

				return false;
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(TryAutoSignInAsync));
			}

			return false;
		}

		public bool CompleteSignin(JToken loginResponse) {
			ProcessLoginResponse processResponse = null;
			try {
				try {
					processResponse = ProcessLogin(loginResponse);
				}
				catch (Exception ex) {
					Log.Error(ex, $"{nameof(CompleteSignin)}");
				}

				if (processResponse?.Success == true) {
					OnSuccess(loginResponse, processResponse.Email);
				}
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(CompleteSignin));
			}

			return processResponse?.Success == true;
		}

		private void OnSuccess(JToken loginResponse, string email) {
			_sessionService.SetState(SessionState.UserSignedIn);
			_eventAggregator.Publish(new SessionReadyEvent());

			if (!email.IsNullOrWhiteSpace()) {
				if (_codeStreamSettingsManager.AutoSignIn) {
					_credentialsService.SaveJson(_codeStreamSettingsManager.ServerUrl.ToUri(), email, GetAccessToken(loginResponse));
				}

				_webviewUserSettingsService.SaveTeamId(_sessionService.SolutionName, GetTeamId(loginResponse));
				Log.Debug("OnSuccessAsync ThreadHelper.JoinableTaskFactory.Run...");

				ThreadHelper.JoinableTaskFactory.Run(async delegate {
					Log.Debug("ThreadHelper.JoinableTaskFactory.Run... About to SwitchToMainThreadAsync...");					
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(CancellationToken.None);
					Log.Debug("SwitchedToMainThreadAsync");
					using (var scope = SettingsScope.Create(_codeStreamSettingsManager)) {
						scope.CodeStreamSettingsManager.Email = email;
					}
				});
			}			
		}	 

		private ProcessLoginResponse ProcessLoginError(JToken loginResponse) {
			var response = new ProcessLoginResponse();
			var error = GetError(loginResponse);

			if (error != null) {
				 
				response.ErrorMessage = error?.Value<string>();
			}
			else if (loginResponse != null) {
				 
				response.Success = true;
			}

			return response;
		}

		private ProcessLoginResponse ProcessLogin(JToken loginResponse) {
			var response = new ProcessLoginResponse();
			var error = GetError(loginResponse);

			if (error != null) {
				//string errorResponse;
				//if (Enum.TryParse(error.ToString(), out LoginResult loginResult)) {
				//	// this is now handled in the webview
				//	//if (loginResult == LoginResult.VERSION_UNSUPPORTED) {
				//	//	await Microsoft.VisualStudio.Shell.ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
				//	//	InfoBarProvider.Instance.ShowInfoBar($"This version of {Application.Name} is no longer supported. Please upgrade to the latest version.");
				//	//}
				//	errorResponse = loginResult.ToString();
				//}
				//else {
				//	errorResponse = error.ToString();
				//}
				//Log.Warning(errorResponse);
				response.ErrorMessage = error?.Value<string>();
			}
			else if (loginResponse != null) {
				response.Email = GetEmail(loginResponse).ToString();

				// don't want all the data in state -- some is sensitive
				var state = GetState(loginResponse);
				var stateLite = JObject.FromObject(new { });
				stateLite["capabilities"] = state["capabilities"];
				stateLite["teamId"] = state["teamId"];
				stateLite["userId"] = state["userId"];
				stateLite["email"] = state["email"];

				_sessionService.SetUser(CreateUser(loginResponse), stateLite);
				response.Success = true;
			}

			return response;
		}

		private User CreateUser(JToken token) {
			var user = token?["loginResponse"]?["user"].ToObject<CsUser>();
			var teamId = GetTeamId(token);

			var teams = (token?["loginResponse"]?["teams"].ToObject<List<CsTeam>>() ?? Enumerable.Empty<CsTeam>())
				.ToList();
			string teamName = teams.Where(_ => _.Id == teamId)
				.Select(_ => _.Name)
				.FirstOrDefault();

			return new User(user.Id, user.Username, user.Email, teamName, teams.Count);
		}

		private string GetTeamId(JToken token) => token?["state"]["teamId"].Value<string>();

		private JToken GetState(JToken token) => token?["state"];
		private JToken GetEmail(JToken token) => token?["loginResponse"]?["user"]?["email"];
		private JToken GetAccessToken(JToken token) => token?["state"]?["token"];
		private JToken GetError(JToken token) {
			if (token != null && token.HasValues && token["error"] != null) {
				return token["error"] ?? new JValue(LoginResult.UNKNOWN.ToString());
			}

			return null;
		}

		class ProcessLoginResponse {
			public bool Success { get; set; }
			public string ErrorMessage { get; set; }
			public string Email { get; set; }
			public JToken Params { get; set; }
		}
	}
}
