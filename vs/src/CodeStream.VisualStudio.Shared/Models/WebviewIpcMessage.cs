using System;
using CodeStream.VisualStudio.Core.Logging;
using Newtonsoft.Json.Linq;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Models {
	/// <summary>
	/// Thin wrapper for plucking out certain JToken properties
	/// </summary>
	public class WebviewIpcMessage : AbstractMessageType<JToken> {
		private static readonly ILogger Log = LogManager.ForContext<WebviewIpcMessage>();

		public WebviewIpcMessage(string id) : this(id, JToken.Parse("{}")) { }

		public WebviewIpcMessage(string id, JToken @params) : this(id, @params, null) { }

		public WebviewIpcMessage(string id, JToken @params, JToken error) : this(id, null, @params, error) { }

		public WebviewIpcMessage(string id, string method, JToken @params, JToken error) {
			Id = id;
			Method = method;
			Params = @params;
			Error = error;
		}

		public override string AsJson() {
			return ToResponseMessage(Id, Method, Params, Error);
		}

		public override string Method { get; }

		public string Target() => Method?.Split(new[] { '/' })[0];

		public static WebviewIpcMessage New() => new WebviewIpcMessage(null);

		public static WebviewIpcMessage Parse(string token) => Parse(JToken.Parse(token));

		public static WebviewIpcMessage Parse(JToken token) {
			string method = null;
			try {
				method = token.Value<string>("method");
				return new WebviewIpcMessage(token.Value<string>("id"),
					method, token.Value<JToken>("params"),
					token.Value<JToken>("error"));
			}
			catch (Exception ex) {
				Log.Error(ex, "Token could not be parsed. Type={Type}", method);
			}

			return WebviewIpcMessage.New();
		}
	}
}
