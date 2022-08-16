using Microsoft.VisualStudio.Shell;

namespace CodeStream.VisualStudio.Core
{
    public static class ServiceLocator
    {
        /// <summary>
        /// GetGlobalService from Package
        /// </summary>
        /// <typeparam name="S">The S version of the interface</typeparam>
        /// <typeparam name="I">The I version of the interface</typeparam>
        /// <returns></returns>
        public static I Get<S, I>()
        {
            return (I)Package.GetGlobalService(typeof(S));
        }
    }
}