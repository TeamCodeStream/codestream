using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Properties;
using Microsoft.VisualStudio.Shell;
using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace CodeStream.VisualStudio.Packages {
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration("#110", "#112", SolutionInfo.Version, IconResourceID = 400)]
	[Guid(Guids.CodeStreamSettingsPackageId)]
	public sealed class CodeStreamPackage : AsyncPackage {
		protected override async System.Threading.Tasks.Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			await base.InitializeAsync(cancellationToken, progress);
			AsyncPackageHelper.InitializePackage(GetType().Name);
		}
	}
}
