using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.IO;

using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Interfaces;
using CodeStream.VisualStudio.Shared.Models;

using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

using Serilog;

namespace CodeStream.VisualStudio.Shared.Services
{
	[Export(typeof(IVsRunningDocTableEvents))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class DocumentEventService : IVsRunningDocTableEvents
	{
		private static readonly ILogger Log = LogManager.ForContext<DocumentEventService>();
		private readonly IVisualStudioSettingsManager _visualStudioSettingsManager;
		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly IHttpClientService _httpClientService;
		private readonly ICollection<int> _fileHash = new List<int>();

		[ImportingConstructor]
		public DocumentEventService(
			IVisualStudioSettingsManager visualStudioSettingsManager,
			ICodeStreamAgentService codeStreamAgentService,
			IHttpClientService httpClientService) : this()
		{
			_visualStudioSettingsManager = visualStudioSettingsManager;
			_codeStreamAgentService = codeStreamAgentService;
			_httpClientService = httpClientService;
		}

		internal DocumentEventService()
		{
			// need this to "start" the monitoring, no touchy.
			var rdt = new RunningDocumentTable();
			rdt.Advise(this);
		}

		public int OnAfterFirstDocumentLock(uint docCookie, uint dwRDTLockType, uint dwReadLocksRemaining, uint dwEditLocksRemaining) => VSConstants.S_OK;

		public int OnBeforeLastDocumentUnlock(uint docCookie, uint dwRDTLockType, uint dwReadLocksRemaining, uint dwEditLocksRemaining) => VSConstants.S_OK;

		public int OnAfterSave(uint docCookie) => VSConstants.S_OK;

		public int OnAfterAttributeChange(uint docCookie, uint grfAttribs) => VSConstants.S_OK;

		public int OnBeforeDocumentWindowShow(uint docCookie, int fFirstShow, IVsWindowFrame pFrame)
		{
			#if DEBUG
				ThreadHelper.ThrowIfNotOnUIThread();
			#endif

			try
			{
				var filename = pFrame.ToString();

				if (!Path.GetExtension(filename).EqualsIgnoreCase(".cs"))
				{
					// we only care about CS files (for now?), nothing else
					return VSConstants.S_OK;
				}

				if (fFirstShow == 0)
				{
					// this file has already been opened before, so bail out
					// and this event fires multiple times per file, so gotta be sure
					return VSConstants.S_OK;
				}

				var isClmEnabled = _visualStudioSettingsManager.IsCodeLevelMetricsEnabled();

				if (!isClmEnabled)
				{
					// if CLM isn't enabled, bail out
					return VSConstants.S_OK;
				}

				var docHash = pFrame.GetHashCode();

				if (_fileHash.Contains(docHash))
				{
					// although fFirstShow SHOULD handle it, also keeping track of hashes cause I ain't trust it 100%
					// so, if we already tracked this hash, bail out
					return VSConstants.S_OK;
				}

				// now we can cache the hashcode, and send the event for this file
				_fileHash.Add(docHash);

				var nrSettings = _httpClientService.GetNREnvironmentSettings();

				var telemetryProps = new TelemetryProperties
				{
					{ "NR Account ID", nrSettings.AccountId },
					{ "Language", "csharp" },// We don't support others (yet?)
					{ "Codelense Count", 0 }// we can't get the value for the file since C# uses namespace+method for CLM
				};

				_codeStreamAgentService.TrackAsync("MLT Codelenses Rendered", telemetryProps);//Codelenses might be spelled wrong, leave it alone
			}
			catch(Exception ex)
			{
				Log.Error(ex, $"Error sending MLT telemetry in {nameof(DocumentEventService)}.{nameof(OnBeforeDocumentWindowShow)}");
			}
			
			return VSConstants.S_OK;

		}

		public int OnAfterDocumentWindowHide(uint docCookie, IVsWindowFrame pFrame) => VSConstants.S_OK;
	}
}
