using Microsoft.VisualStudio.Shell;
using System;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Shared.Services {
	[Export(typeof(ICodeStreamAgentServiceFactory))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	public class CodeStreamAgentServiceFactory : ServiceFactory<ICodeStreamAgentService>, ICodeStreamAgentServiceFactory {
		[ImportingConstructor]
		public CodeStreamAgentServiceFactory([Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) :
			base(serviceProvider) {
		}
	}
}
