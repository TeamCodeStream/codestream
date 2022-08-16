using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using System;

namespace CodeStream.VisualStudio.Shared.Services {
	public static class ServiceProviderExtensions {
		public static T GetService<T>(this IServiceProvider serviceProvider) where T : class {
			return serviceProvider.GetService<T>(typeof(T));
		}

		public static T GetService<T>(this IServiceProvider serviceProvider, Type serviceType) where T : class {
			if (serviceProvider == null) throw new ArgumentNullException(nameof(serviceProvider));
			if (serviceType == null) throw new ArgumentNullException(nameof(serviceType));

			T service = serviceProvider.TryGetService<T>(serviceType);

			if (service == null)
				throw new InvalidOperationException($"Service not found: {typeof(T)}");

			return service;
		}

		public static T TryGetService<T>(this IServiceProvider serviceProvider, Type serviceType) where T : class {
			if (serviceProvider == null) throw new ArgumentNullException(nameof(serviceProvider));
			if (serviceType == null) throw new ArgumentNullException(nameof(serviceType));

			return serviceProvider.GetService(serviceType) as T;
		}

		public static uint GetCmdUIContextCookie(this IVsMonitorSelection vsMonitorSelection, Guid id) {
			ThreadHelper.ThrowIfNotOnUIThread();
			ErrorHandler.ThrowOnFailure(vsMonitorSelection.GetCmdUIContextCookie(ref id, out var cookie));
			return cookie;
		}

		public static string GetSolutionFile(this IVsSolution solution) {
			if (solution == null) throw new ArgumentNullException(nameof(solution));

			string empty1 = string.Empty;
			string empty2 = string.Empty;
			string empty3 = string.Empty;

			ThreadHelper.ThrowIfNotOnUIThread(nameof(GetSolutionFile));
			ErrorHandler.Succeeded(solution.GetSolutionInfo(out empty1, out empty2, out empty3));

			return empty2;
		}
	}
}
