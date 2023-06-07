using EnvDTE;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio;
using System.Collections.Generic;
using System;
using Microsoft.VisualStudio.Shell;
using System.ComponentModel.Composition;
using System.Linq;
using Microsoft;
using System.Diagnostics;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface ISolutionFileEnumerationService
	{
		ReadOnlySpan<string> GetFilesInSolution();
		void ClearCache();
	}

	[Export(typeof(ISolutionFileEnumerationService))]
	public class SolutionFileEnumerationService : ISolutionFileEnumerationService
	{
		private readonly IVsSolution _solution;

		private IList<string> _files;

		[ImportingConstructor]
		public SolutionFileEnumerationService([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider)
		{
			if (serviceProvider == null)
			{
				throw new ArgumentNullException(nameof(serviceProvider));
			}
			
			_solution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
			
			Assumes.Present(_solution);
		}

		public void ClearCache()
		{
			_files = null;
		}

		public ReadOnlySpan<string> GetFilesInSolution()
		{
			if(_files != null)
			{
				return new ReadOnlySpan<string>(_files.ToArray());
			}

			_files = new List<string>();

			_solution.GetProjectEnum((uint)__VSENUMPROJFLAGS.EPF_ALLINSOLUTION, Guid.Empty, out var enumHierarchies);

			if (enumHierarchies != null)
			{
				var hierarchies = new IVsHierarchy[1];
				while (enumHierarchies.Next(1, hierarchies, out var fetched) == VSConstants.S_OK && fetched == 1)
				{
					EnumerateProjectItems(hierarchies[0]);
				}
			}
		
			return new ReadOnlySpan<string>(_files.ToArray());
		}

		private void EnumerateProjectItems(IVsHierarchy hierarchy)
		{
			if (hierarchy == null)
			{
				return;
			}

			hierarchy.GetProperty((uint)VSConstants.VSITEMID.Root, (int)__VSHPROPID.VSHPROPID_ExtObject, out var projectObj);

			if (projectObj is Project project)
			{
				EnumerateProjectItems(project.ProjectItems);
			}
		}

		private void EnumerateProjectItems(ProjectItems projectItems)
		{
			if (projectItems == null)
			{
				return;
			}

			foreach (var item in projectItems)
			{
				var projectItem = (ProjectItem)item;

				if (projectItem.Kind == EnvDTE.Constants.vsProjectItemKindPhysicalFile)
				{
					var filePath = projectItem.Properties.Item("FullPath").Value.ToString();
					_files.Add(filePath);
				}
				
				EnumerateProjectItems(projectItem.ProjectItems);
			}
		}
	}
}
