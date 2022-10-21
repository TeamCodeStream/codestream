using System;
using System.ComponentModel.Composition;

using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Services;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Shell;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Services {
	/// <summary>
	/// Webview settings are saved to something resembling a 'workspace' -- currently, this is
	/// based off of a solution
	/// </summary>
	[Export(typeof(IWebviewUserSettingsService))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class WebviewUserSettingsService : UserSettingsService, IWebviewUserSettingsService {
		private static readonly ILogger Log = LogManager.ForContext<WebviewUserSettingsService>();

		[ImportingConstructor]
		public WebviewUserSettingsService([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) : base(serviceProvider) { }

		///  <remarks>
		///  Saves to a structure like:
		///  codestream
		/// 		codestream.{solutionName}.{teamId}
		/// 			data: dictionary[string, object]
		///  </remarks>
		public bool SaveContext(string solutionName, WebviewContext context) {
			if (context == null)
			{
				return false;
			}

			return Save($"{solutionName}.{context.CurrentTeamId}", UserSettingsKeys.WebviewContext, context);
		}

		public bool TryClearContext(string solutionName, string teamId) {
			try {
				return Save($"{solutionName}.{teamId}", UserSettingsKeys.WebviewContext, null);
			}
			catch (Exception ex) {
				Log.Warning(ex, nameof(TryClearContext));
				return false;
			}
		}
		
		public WebviewContext TryGetWebviewContext(string solutionName, string teamId)
			=> TryGetValue<WebviewContext>($"{solutionName}.{teamId}", UserSettingsKeys.WebviewContext);

		public bool SaveTeamId(string solutionName, string teamId) 
			=> Save($"{solutionName}", UserSettingsKeys.TeamId, teamId);

		public string TryGetTeamId(string solutionName) 
			=> TryGetValue<string>($"{solutionName}", UserSettingsKeys.TeamId);

		public bool DeleteTeamId(string solutionName) 
			=> Save($"{solutionName}", UserSettingsKeys.TeamId, null);
	}
}
