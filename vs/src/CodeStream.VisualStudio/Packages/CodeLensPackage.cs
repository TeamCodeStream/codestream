using System;
using System.Runtime.InteropServices;
using System.Threading;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Services;
using Microsoft.VisualStudio.Shell;
using Task = System.Threading.Tasks.Task;

namespace CodeStream.VisualStudio.Packages {

	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration("#111", "#112", Core.Properties.SolutionInfo.Version, IconResourceID = 400)]
	[Guid(Guids.CodeLensPackageId)]
	public class CodeLensPackage : AsyncPackage {

		protected override async Task InitializeAsync(
			CancellationToken cancellationToken,
			IProgress<ServiceProgressData> progress) {

			AsyncPackageHelper.InitializePackage(GetType().Name);

			await base.InitializeAsync(cancellationToken, progress);
			await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

			_ = CodeLensConnectionHandler.AcceptCodeLensConnectionsAsync();
		}
	}
}
