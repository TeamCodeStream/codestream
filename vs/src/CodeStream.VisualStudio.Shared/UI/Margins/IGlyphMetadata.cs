using System;
using System.Collections.Generic;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.Margins
{
    public interface IContentTypeMetadata
    {
        IEnumerable<string> ContentTypes { get; }
    }

    public interface ITextViewRoleMetadata
    {
        IEnumerable<string> TextViewRoles { get; }
    }

    public interface ITaggerMetadata : IContentTypeMetadata
    {
        IEnumerable<Type> TagTypes { get; }
    }

    public interface IGlyphMetadata : ITaggerMetadata, IOrderable
    {
    }
}
