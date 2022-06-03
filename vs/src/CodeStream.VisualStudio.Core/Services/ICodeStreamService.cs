using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core.Models;

namespace CodeStream.VisualStudio.Core.Services {
	public interface ICodeStreamService {
		Task ResetActiveEditorAsync();
		Task ChangeActiveEditorAsync(Uri uri);
		Task ChangeActiveEditorAsync(Uri uri, ActiveTextEditor activeTextEditor = null);
		Task ChangeCaretAsync(Uri uri, List<Range> visibleRange, int cursorLine, int lineCount);
		Task NewCodemarkAsync(Uri uri, Range range, CodemarkType codemarkType, string source, CancellationToken? cancellationToken = null);
		Task StartWorkAsync(string source, Uri uri = null, CancellationToken? cancellationToken = null);
		Task ShowCodemarkAsync(string codemarkId, string filePath, CancellationToken? cancellationToken = null);
		Task NewReviewAsync(Uri uri, string source, CancellationToken? cancellationToken = null);
		Task NextChangedFileAsync();
		Task PreviousChangedFileAsync();
		Task EditorSelectionChangedNotificationAsync(Uri uri,
			EditorState editorState,
			List<Range> visibleRanges,
			int? totalLines,
			CodemarkType codemarkType,
			CancellationToken? cancellationToken = null);
		Task OpenCommentByThreadAsync(string streamId, string threadId, string codemarkId = null);
		/// <summary>
		/// logs the user out from the CodeStream agent and the session
		/// </summary>
		/// <returns></returns>
		//Task LogoutAsync();
		IBrowserService BrowserService { get; }
		bool IsReady { get; }
		Task ConfigChangeReloadNotificationAsync();
		Task ViewMethodLevelTelemetryNotificationAsync(RepoInfo repo, string functionName, string newRelicEntityGuid, MetricTimesliceNameMapping metricTimeSliceNameMapping);
	}
}
