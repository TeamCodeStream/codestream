using System;
using Microsoft.VisualStudio.Shell;

namespace CodeStream.VisualStudio.Shared.Extensions
{
    public static class PackageExtensions
    {
        public static T Invoke<T>(Type serviceType, string methodName)
        {
            if (serviceType == null) return default(T);

            var service = Package.GetGlobalService(serviceType);
            var method = service?.GetType().GetMethod(methodName);
            return (T)method?.Invoke(service, null);
        }
    }
}
