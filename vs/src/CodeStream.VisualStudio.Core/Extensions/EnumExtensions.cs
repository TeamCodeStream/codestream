using System;

namespace CodeStream.VisualStudio.Core.Extensions
{
    public static class EnumExtensions
    {
        public static string ToJsonValue(this Enum e) => e.ToString().ToLowerInvariant();
    }
}
