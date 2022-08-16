using Microsoft;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Events;
using Microsoft.VisualStudio.Shell.Interop;
using System;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Shared.Services {

	[Export(typeof(ISolutionEventsListener))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public sealed class SolutionEventsListener : IVsSolutionEvents, IVsSolutionLoadEvents, ISolutionEventsListener, IDisposable, IVsSolutionEvents7 {
		private readonly IVsSolution _vsSolution;
		private uint _pdwCookie;

		/// <summary>
		/// Ugh, this sucks having to track this here -- but since
		/// OnAfterCloseSolution gets called for both Solutions and Folders
		/// we're slightly screwed...
		/// </summary>
		private ProjectType _currentProjectType;

		[ImportingConstructor]
		public SolutionEventsListener([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			if (serviceProvider == null) throw new ArgumentNullException(nameof(serviceProvider));
			_vsSolution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
			Assumes.Present(_vsSolution);

			AdviseSolutionEvents();
		}		

		private void OnSolutionOpened() {
			if (Opened == null)
				return;

			string solutionFile = _vsSolution.GetSolutionFile();
			if (string.IsNullOrEmpty(solutionFile))
				return;

			_currentProjectType = ProjectType.Solution;
			Opened(this, new HostOpenedEventArgs(ProjectType.Solution, solutionFile));
		}

		private void OnFolderOpened(string folderPath) {
			if (Opened == null)
				return;

			string solutionFile = _vsSolution.GetSolutionFile();
			if (string.IsNullOrEmpty(solutionFile))
				return;

			_currentProjectType = ProjectType.Folder;
			Opened(this, new HostOpenedEventArgs(ProjectType.Folder, solutionFile, folderPath));
		}

		private void OnSolutionClosing() {
			Closing?.Invoke(this, EventArgs.Empty);
		}

		private void OnSolutionClosed() {
			Closed?.Invoke(this, new HostClosedEventArgs(ProjectType.Solution));
			_currentProjectType = ProjectType.Unknown;
		}

		private void OnFolderClosed() {
			Closed?.Invoke(this, new HostClosedEventArgs(ProjectType.Folder));
			_currentProjectType = ProjectType.Unknown;
		}

		private void OnSolutionLoadComplete() {
			TriggerLoadedEvent();
		}

		private void TriggerLoadedEvent() {
			Loaded?.Invoke(this, EventArgs.Empty);
		}

		int IVsSolutionEvents.OnAfterCloseSolution(object pUnkReserved) {
			//sadly this gets called for solutions AND folders, ugh
			if (_currentProjectType == ProjectType.Folder) {
				this.OnFolderClosed();
			}
			else if (_currentProjectType == ProjectType.Solution) {
				this.OnSolutionClosed();
			}
			return 0;
		}

		int IVsSolutionEvents.OnAfterLoadProject(IVsHierarchy pStubHierarchy, IVsHierarchy pRealHierarchy) {
			AfterLoadProject?.Invoke(this, new LoadProjectEventArgs(pRealHierarchy, pStubHierarchy));
			return 0;
		}

		int IVsSolutionEvents.OnAfterOpenProject(IVsHierarchy pHierarchy, int fAdded) {
			AfterOpenProject?.Invoke(this, new OpenProjectEventArgs(pHierarchy, Convert.ToBoolean(fAdded)));
			return 0;
		}

		int IVsSolutionEvents.OnAfterOpenSolution(object pUnkReserved, int fNewSolution) {
			OnSolutionOpened();
			return 0;
		}

		int IVsSolutionEvents.OnBeforeCloseProject(IVsHierarchy pHierarchy, int fRemoved) {
			BeforeCloseProject?.Invoke(this, new CloseProjectEventArgs(pHierarchy, Convert.ToBoolean(fRemoved)));
			return 0;
		}

		int IVsSolutionEvents.OnBeforeCloseSolution(object pUnkReserved) {
			OnSolutionClosing();
			return 0;
		}

		int IVsSolutionEvents.OnBeforeUnloadProject(IVsHierarchy pRealHierarchy, IVsHierarchy pStubHierarchy) {
			return 0;
		}

		int IVsSolutionEvents.OnQueryCloseProject(IVsHierarchy pHierarchy, int fRemoving, ref int pfCancel) {
			return 0;
		}

		int IVsSolutionEvents.OnQueryCloseSolution(object pUnkReserved, ref int pfCancel) {
			return 0;
		}

		int IVsSolutionEvents.OnQueryUnloadProject(IVsHierarchy pRealHierarchy, ref int pfCancel) {
			return 0;
		}

		public event EventHandler<HostOpenedEventArgs> Opened;

		public event EventHandler Closing;

		public event EventHandler<HostClosedEventArgs> Closed;

		public event EventHandler Loaded;

		public event EventHandler<OpenProjectEventArgs> AfterOpenProject;

		public event EventHandler<LoadProjectEventArgs> AfterLoadProject;

		public event EventHandler<CloseProjectEventArgs> BeforeCloseProject;

		public event EventHandler<HierarchyEventArgs> ProjectRenamed;

		public int OnAfterBackgroundSolutionLoadComplete() {
			OnSolutionLoadComplete();
			return 0;
		}

		public int OnAfterLoadProjectBatch(bool fIsBackgroundIdleBatch) {
			return 0;
		}

		public int OnBeforeBackgroundSolutionLoadBegins() {
			return 0;
		}

		public int OnBeforeLoadProjectBatch(bool fIsBackgroundIdleBatch) {
			return 0;
		}

		public int OnBeforeOpenSolution(string pszSolutionFilename) {
			return 0;
		}

		public int OnQueryBackgroundLoadProjectBatch(out bool pfShouldDelayLoadToNextIdle) {
			pfShouldDelayLoadToNextIdle = false;
			return 0;
		}

		private void AdviseSolutionEvents() {
			ThreadHelper.JoinableTaskFactory.RunAsync(async () => {
				var solutionEventsListener = this;
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
				ErrorHandler.ThrowOnFailure(solutionEventsListener._vsSolution.AdviseSolutionEvents(solutionEventsListener, out solutionEventsListener._pdwCookie));
			});
		}

		private void UnadviseSolutionEvents() {
			ThreadHelper.JoinableTaskFactory.RunAsync(async () => {
				await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
				if (_pdwCookie == 0U || _vsSolution == null)
					return;
				_vsSolution.UnadviseSolutionEvents(_pdwCookie);
				_pdwCookie = 0U;
			});
		}

		public int OnAfterRenameProject(IVsHierarchy hierarchy) {
			ProjectRenamed?.Invoke(this, new HierarchyEventArgs(hierarchy));
			return 0;
		}

		public void OnAfterOpenFolder(string folderPath) {
			OnFolderOpened(folderPath);
			OnSolutionLoadComplete();
		}

		public void OnBeforeCloseFolder(string folderPath) {
			OnSolutionClosing();
		}

		public void OnQueryCloseFolder(string folderPath, ref int pfCancel) {
		}

		public int OnAfterAsynchOpenProject(IVsHierarchy pHierarchy, int fAdded) {
			return 0;
		}

		public int OnAfterChangeProjectParent(IVsHierarchy pHierarchy) {
			return 0;
		}

		public int OnQueryChangeProjectParent(IVsHierarchy pHierarchy, IVsHierarchy pNewParentHier, ref int pfCancel) {
			return 0;
		}

		public void OnAfterCloseFolder(string folderPath) {
			this.OnFolderClosed();
		}

		public void OnAfterLoadAllDeferredProjects() {
		}

		public void Dispose() {
			UnadviseSolutionEvents();
			_currentProjectType = ProjectType.Unknown;
		}
	}
}
