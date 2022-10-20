using System;
using System.Collections.Generic;
using System.Diagnostics;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Extensions;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Models {
	public interface IAbstractMessageType {
		string Id { get; }
		string Method { get; }
		JToken Error { get; set; }
	}

	public interface INotificationType : IAbstractMessageType { }

	public interface IRequestType : IAbstractMessageType { }

	[DebuggerDisplay("Method={Method}")]
	public abstract class AbstractMessageType<T> : IAbstractMessageType {
		
		[JsonProperty("method", NullValueHandling = NullValueHandling.Ignore)]
		public abstract string Method { get; }

		[JsonProperty("id", NullValueHandling = NullValueHandling.Ignore)]
		public string Id { get; set; }

		public Type TType => typeof(T);

		[JsonProperty("params", NullValueHandling = NullValueHandling.Ignore)]
		public T TParams { get; set; }
		
		[JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
		public JToken Error { get; set; }
	}

	[DebuggerDisplay("Method={Method}")]
	public abstract class RequestType<T> : AbstractMessageType<T>, IRequestType { }

	[DebuggerDisplay("Method={Method}")]
	public abstract class RequestType : AbstractMessageType<JToken>, IRequestType { }

	[DebuggerDisplay("Method={Method}")]
	public abstract class NotificationType<T> : AbstractMessageType<T>, INotificationType { }

	[DebuggerDisplay("Method={Method}")]
	public abstract class NotificationType : AbstractMessageType<JToken>, INotificationType
	{
		protected NotificationType(JToken @params) => TParams = @params;
	}

}
