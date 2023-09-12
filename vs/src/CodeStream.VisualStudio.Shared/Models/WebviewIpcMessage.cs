using System;
using CodeStream.VisualStudio.Core.Logging;
using Newtonsoft.Json.Linq;
using Serilog;

namespace CodeStream.VisualStudio.Shared.Models
{
	/// <summary>
	/// Thin wrapper for plucking out certain JToken properties
	/// </summary>
	public class WebviewIpcMessage : NotificationType
	{
		private static readonly ILogger Log = LogManager.ForContext<WebviewIpcMessage>();

		public WebviewIpcMessage(string id)
			: this(id, null, JToken.Parse("{}"), null) { }

		public WebviewIpcMessage(string id, string method, JToken @params, JToken error)
			: base(@params)
		{
			Id = id;
			Method = method;
			Error = error;
		}

		public override string Method { get; }

		public string Target() => Method?.Split(new[] { '/' })[0];

		public static WebviewIpcMessage New() => new WebviewIpcMessage(null);

		public static WebviewIpcMessage Parse(string token) => Parse(JToken.Parse(token));

		public static WebviewIpcMessage Parse(JToken token)
		{
			string method = null;
			try
			{
				method = token.Value<string>("method");
				return new WebviewIpcMessage(
					token.Value<string>("id"),
					method,
					token.Value<JToken>("params"),
					token.Value<JToken>("error")
				);
			}
			catch (Exception ex)
			{
				Log.Error(ex, "Token could not be parsed. Type={Type}", method);
			}

			return WebviewIpcMessage.New();
		}
	}
}
