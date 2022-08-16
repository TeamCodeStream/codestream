using System.Collections.Generic;
using System.Diagnostics;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Shared.Extensions;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Shared.Models {
	public interface IAbstractMessageType {
		string Id { get; }
		string Method { get; }
		JToken Error { get; set; }
		string AsJson();
	}

	public static class IAbstractMessageTypeExtensions {
		public static string ToLoggableString(this IAbstractMessageType message) {
			return message == null ? null : message.ToLoggableDictionary(null, false).ToKeyValueString();
		}

		public static Dictionary<string, object> ToLoggableDictionary(this IAbstractMessageType message, string name, bool canEnqueue) {
			if (message == null) return null;
			var result = new Dictionary<string, object> { };
			if (name != null) {
				result.Add(nameof(name), name);
			}
			if (!message.Id.IsNullOrWhiteSpace()) {
				result.Add(nameof(message.Id), message.Id);
			}
			if (!message.Method.IsNullOrWhiteSpace()) {
				result.Add(nameof(message.Method), message.Method);
			}
			if (message.Error != null) {
				result.Add(nameof(message.Error), message.Error);
			}
			if (canEnqueue) {
				result.Add(nameof(canEnqueue), "true");
			}
			return result;
		}
	}

	public interface INotificationType : IAbstractMessageType { }

	public interface INotificationType<T> : IAbstractMessageType { }

	public interface IRequestType : IAbstractMessageType { }

	public interface IAbstractMessageType<T> : IAbstractMessageType {
		T Params { get; set; }
	}

	[DebuggerDisplay("Method={Method}")]
	public abstract class AbstractMessageType<T> : IAbstractMessageType<T> {
		/// <summary>
		/// The method to be invoked.
		/// </summary>
		public abstract string Method { get; }

		public string Id { get; set; }

		public T Params { get; set; }

		public JToken Error { get; set; }

		public virtual string AsJson() {
			return ToResponseMessage(Id, Method, JToken.Parse(Params.ToJson()), Error);
		}

		protected static string ToResponseMessage(string id, string method, JToken @params, JToken error) {
			var result = new JObject();
			if (!id.IsNullOrWhiteSpace()) {
				result["id"] = id;
			}
			if (!method.IsNullOrWhiteSpace()) {
				result["method"] = method;
			}
			if (@params != null) {
				result["params"] = @params;
			}
			if (error != null) {
				result["error"] = error;
			}

			var r = result.ToString();
			return r;
		}
	}

	[DebuggerDisplay("Method={Method}")]
	public abstract class RequestType<T> : AbstractMessageType<T>, IRequestType { }

	[DebuggerDisplay("Method={Method}")]
	public abstract class NotificationType<T> : AbstractMessageType<T>, INotificationType<T> { }

	public static class CustomNotificationPayload {
		public static string Create(string method, JToken token) {
			return @"{""method"":""" + method + @""",""params"":" + token.ToJson() + "}";
		}
	}
}
