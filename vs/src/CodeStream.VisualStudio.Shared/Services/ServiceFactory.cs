using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Serilog;
using System;
using System.ComponentModel.Composition;
using CodeStream.VisualStudio.Core.Extensions;

namespace CodeStream.VisualStudio.Shared.Services
{
	public interface IServiceFactory<T>
	{
		T Create();
	}

	public abstract class ServiceFactory<T> : IServiceFactory<T>
		where T : class
	{
		private static readonly ILogger Log = LogManager.ForContext<ServiceFactory<T>>();
		private readonly IServiceProvider _serviceProvider;

		protected ServiceFactory(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider
		)
		{
			_serviceProvider = serviceProvider;
		}

		public virtual T Create()
		{
			try
			{
				using (var metrics = Log.WithMetrics($"{nameof(ServiceFactory<T>)} {typeof(T)}"))
				{
					var componentModel =
						_serviceProvider.GetService(typeof(SComponentModel)) as IComponentModel;
					if (componentModel == null)
					{
						Log.Error($"missing ComponentModel");
					}
					Microsoft.Assumes.Present(componentModel);

					var service = componentModel.GetService<T>();
					Microsoft.Assumes.Present(service);
					return service;
				}
			}
			catch (CompositionException ex)
			{
				Log.Fatal(ex.UnwrapCompositionException(), nameof(Create) + " (Composition)");
				throw;
			}
			catch (Exception ex)
			{
				Log.Fatal(ex.UnwrapCompositionException(), nameof(Create));
				throw;
			}
		}
	}
}
