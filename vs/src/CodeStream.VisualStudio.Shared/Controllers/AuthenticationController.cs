using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.Shell;
using Newtonsoft.Json.Linq;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;

namespace CodeStream.VisualStudio.Shared.Controllers
{
	public class AuthenticationController
	{
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
			IWebviewUserSettingsService webviewUserSettingsService
		)
		{
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
			IWebviewUserSettingsService webviewUserSettingsService
		)
		{
			_codeStreamSettingsManager = codeStreamSettingManager;
			_sessionService = sessionService;
			_eventAggregator = eventAggregator;
			_credentialsService = credentialsService;
			_webviewUserSettingsService = webviewUserSettingsService;
		}

		public async Task<bool> TryAutoSignInAsync()
		{
			try
			{
				if (
					!_codeStreamSettingsManager.AutoSignIn
					|| _codeStreamSettingsManager.Email.IsNullOrWhiteSpace()
				)
				{
					Log.Debug("AutoSignIn or Email is missing");
					return false;
				}

				var teamId = _codeStreamSettingsManager.Team;
				var token = await _credentialsService.LoadJsonAsync(
					_codeStreamSettingsManager.ServerUrl.ToUri(),
					_codeStreamSettingsManager.Email,
					teamId
				);

				if (token != null)
				{
					Log.Debug("Attempting to AutoSignIn");

					try
					{
						var loginResponse = await _codeStreamAgent.LoginViaTokenAsync(
							token,
							teamId
						);
						var processResponse = ProcessLoginError(loginResponse);

						Log.Debug($"{nameof(processResponse)} Success={processResponse?.Success}");

						if (processResponse?.Success ?? false)
						{
							return true;
						}

						if (
							Enum.TryParse(
								processResponse?.ErrorMessage,
								out LoginResult loginResult
							)
							&& loginResult != LoginResult.VERSION_UNSUPPORTED
						)
						{
							await _credentialsService.DeleteAsync(
								_codeStreamSettingsManager.ServerUrl.ToUri(),
								_codeStreamSettingsManager.Email,
								teamId
							);
						}

						return false;
					}
					catch (Exception ex)
					{
						Log.Warning(ex, $"{nameof(TryAutoSignInAsync)}");
					}
				}
				else
				{
					Log.Debug("Missing token");
				}

				return false;
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(TryAutoSignInAsync));
			}

			return false;
		}

		public bool CompleteSignin(JToken loginResponse)
		{
			ProcessLoginResponse processResponse = null;
			try
			{
				try
				{
					processResponse = ProcessLogin(loginResponse);
				}
				catch (Exception ex)
				{
					Log.Error(ex, $"{nameof(CompleteSignin)}");
				}

				if (processResponse?.Success == true)
				{
					OnSuccess(loginResponse, processResponse.Email, processResponse.TeamId);
				}
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(CompleteSignin));
			}

			return processResponse?.Success == true;
		}

		private void OnSuccess(JToken loginResponse, string email, string teamId)
		{
			_sessionService.SetState(SessionState.UserSignedIn);
			_eventAggregator.Publish(new SessionReadyEvent());

			if (email.IsNullOrWhiteSpace())
			{
				return;
			}

			if (_codeStreamSettingsManager.AutoSignIn)
			{
				_credentialsService.SaveJson(
					_codeStreamSettingsManager.ServerUrl.ToUri(),
					email,
					GetAccessToken(loginResponse),
					teamId
				);
			}

			_webviewUserSettingsService.SaveTeamId(_sessionService.SolutionName, teamId);
			Log.Debug("OnSuccessAsync ThreadHelper.JoinableTaskFactory.Run...");

			ThreadHelper.JoinableTaskFactory.Run(
				async delegate
				{
					Log.Debug(
						"ThreadHelper.JoinableTaskFactory.Run... About to SwitchToMainThreadAsync..."
					);
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(
						CancellationToken.None
					);
					Log.Debug("SwitchedToMainThreadAsync");
					using (var scope = SettingsScope.Create(_codeStreamSettingsManager))
					{
						scope.CodeStreamSettingsManager.Email = email;
						scope.CodeStreamSettingsManager.Team = teamId;
					}
				}
			);
		}

		private static ProcessLoginResponse ProcessLoginError(JToken loginResponse)
		{
			var response = new ProcessLoginResponse();
			var error = GetError(loginResponse);

			if (error != null)
			{
				response.ErrorMessage = error.Value<string>();
			}
			else if (loginResponse != null)
			{
				response.Success = true;
			}

			return response;
		}

		private ProcessLoginResponse ProcessLogin(JToken loginResponse)
		{
			var response = new ProcessLoginResponse();
			var error = GetError(loginResponse);

			if (error != null)
			{
				response.ErrorMessage = error.Value<string>();
			}
			else if (loginResponse != null)
			{
				response.Email = GetEmail(loginResponse);
				response.TeamId = GetTeamId(loginResponse);

				// don't want all the data in state -- some is sensitive
				var state = GetState(loginResponse);
				var stateLite = JObject.FromObject(new { });
				stateLite["capabilities"] = state["capabilities"];
				stateLite["teamId"] = state["teamId"];
				stateLite["userId"] = state["userId"];
				stateLite["email"] = state["email"];
				stateLite["eligibleJoinCompanies"] = GetEligibleJoinCompanies(loginResponse);

				_sessionService.SetUser(CreateUser(loginResponse), stateLite);
				response.Success = true;
			}

			return response;
		}

		private static User CreateUser(JToken token)
		{
			var user = token?["loginResponse"]?["user"]?.ToObject<CsUser>();
			var teamId = GetTeamId(token);

			var availableTeams = (
				token?["loginResponse"]?["teams"]?.ToObject<List<CsTeam>>()
				?? Enumerable.Empty<CsTeam>()
			).ToList();
			var currentTeam = availableTeams.FirstOrDefault(_ => _.Id == teamId.ToString());

			var availableCompanies = (
				token?["loginResponse"]?["companies"]?.ToObject<List<CsCompany>>()
				?? Enumerable.Empty<CsCompany>()
			).ToList();
			var currentCompany = availableCompanies.FirstOrDefault(
				x => x.Id == currentTeam?.CompanyId
			);

			return new User(
				user?.Id,
				user?.Username,
				user?.Email,
				currentTeam?.Name,
				availableTeams.Count,
				currentCompany?.CompanyName,
				availableCompanies.Count
			);
		}

		private static string GetTeamId(JToken token) =>
			token?["state"]?["token"]?["teamId"]?.ToString();

		private static JToken GetState(JToken token) => token?["state"];

		private static JToken GetEligibleJoinCompanies(JToken token) =>
			token?["loginResponse"]?["user"]?["eligibleJoinCompanies"];

		private static string GetEmail(JToken token) =>
			token?["loginResponse"]?["user"]?["email"]?.ToString();

		private static JToken GetAccessToken(JToken token) => token?["state"]?["token"];

		private static JToken GetError(JToken token)
		{
			if (token != null && token.HasValues && token["error"] != null)
			{
				return token["error"] ?? new JValue(LoginResult.UNKNOWN.ToString());
			}

			return null;
		}

		private class ProcessLoginResponse
		{
			public bool Success { get; set; }
			public string ErrorMessage { get; set; }
			public string Email { get; set; }
			public string TeamId { get; set; }
			public JToken Params { get; set; }
		}
	}
}
