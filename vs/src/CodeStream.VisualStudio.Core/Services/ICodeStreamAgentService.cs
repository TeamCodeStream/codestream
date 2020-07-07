using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json.Linq;
using StreamJsonRpc;

namespace CodeStream.VisualStudio.Core.Services {
	public interface ICodeStreamAgentService {
		Task SetRpcAsync(JsonRpc rpc);
		Task<T> SendAsync<T>(string name, object arguments, CancellationToken? cancellationToken = null);
		Task<JToken> ReinitializeAsync();
		Task<CreateDocumentMarkerPermalinkResponse> CreatePermalinkAsync(Range range, string uri, string privacy);
		Task<CreatePostResponse> CreatePostAsync(string streamId, string threadId, string text);
		Task<GetFileStreamResponse> GetFileStreamAsync(Uri uri);
		Task<GetPostResponse> GetPostAsync(string streamId, string postId);
		Task<GetUserResponse> GetUserAsync(string userId);
		Task<GetStreamResponse> GetStreamAsync(string streamId);
		Task<CsDirectStream> CreateDirectStreamAsync(List<string> memberIds);
		Task<JToken> LoginViaTokenAsync(JToken token, string team, string teamId = null);
		Task<JToken> OtcLoginRequestAsync(OtcLoginRequest request);
		Task<JToken> LoginAsync(string email, string password, string serverUrl, string teamId);
		Task<JToken> LogoutAsync();
		Task<JToken> GetBootstrapAsync(Settings settings, JToken state = null, bool isAuthenticated = false);
		Task<FetchCodemarksResponse> GetMarkersAsync(string streamId);
		Task<DocumentFromMarkerResponse> GetDocumentFromMarkerAsync(DocumentFromMarkerRequest request);
		Task<DocumentMarkersResponse> GetMarkersForDocumentAsync(Uri uri, bool excludeArchived, CancellationToken? cancellationToken = null);
		Task<FetchStreamsResponse> FetchStreamsAsync(FetchStreamsRequest request);
		Task TrackAsync(string key, TelemetryProperties properties = null);
		Task SetServerUrlAsync(string serverUrl, bool? disableStrictSSL);
	}
}
