using Newtonsoft.Json.Converters;

namespace CodeStream.VisualStudio.Core
{
    public class CamelCaseStringEnumConverter : StringEnumConverter
    {
        public CamelCaseStringEnumConverter()
        {
            this.CamelCaseText = true;
        }
    }
}