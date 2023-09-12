using Microsoft.VisualStudio.Shell.Events;
using System;

namespace CodeStream.VisualStudio.Shared.Services
{
	public class HostOpenedEventArgs : EventArgs
	{
		public ProjectType ProjectType { get; }
		public string FileName { get; private set; }
		public string FolderPath { get; }

		public HostOpenedEventArgs(
			ProjectType projectType,
			string fileName,
			string folderPath = null
		)
		{
			ProjectType = projectType;
			FileName = fileName;
			FolderPath = folderPath;
		}
	}

	public class HostClosedEventArgs : EventArgs
	{
		public ProjectType ProjectType { get; }

		public HostClosedEventArgs(ProjectType projectType)
		{
			ProjectType = projectType;
		}
	}

	public enum ProjectType
	{
		Unknown,
		Solution,
		Folder
	}

	public interface ISolutionEventsListener
	{
		event EventHandler<HostOpenedEventArgs> Opened;

		event EventHandler Closing;

		event EventHandler<HostClosedEventArgs> Closed;

		event EventHandler Loaded;

		event EventHandler<OpenProjectEventArgs> AfterOpenProject;

		event EventHandler<LoadProjectEventArgs> AfterLoadProject;

		event EventHandler<HierarchyEventArgs> ProjectRenamed;

		event EventHandler<CloseProjectEventArgs> BeforeCloseProject;
	}
}
