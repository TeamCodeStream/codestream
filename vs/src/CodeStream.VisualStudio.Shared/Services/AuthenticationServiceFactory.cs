using Microsoft.VisualStudio.Shell;
using System;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Shared.Services
{
	[Export(typeof(IAuthenticationServiceFactory))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class AuthenticationServiceFactory
		: ServiceFactory<IAuthenticationService>,
			IAuthenticationServiceFactory
	{
		[ImportingConstructor]
		public AuthenticationServiceFactory(
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider
		)
			: base(serviceProvider) { }
	}
}
