import { RequestType } from "vscode-jsonrpc";
import { IpcRoutes } from "./webview.protocol";

export type ReviewCheckpoint = number | undefined;

export interface ReviewShowDiffRequest {
	reviewId: string;
	checkpoint: ReviewCheckpoint;
	repoId: string;
	path: string;
}

export interface ReviewShowDiffResponse {}

export const ReviewShowDiffRequestType = new RequestType<
	ReviewShowDiffRequest,
	ReviewShowDiffResponse,
	void,
	void
>(`${IpcRoutes.Host}/review/showDiff`);

export interface ReviewShowLocalDiffRequest {
	repoId: string;
	path: string;
	oldPath?: string;
	includeSaved: boolean;
	includeStaged: boolean;
	editingReviewId?: string;
	baseSha: string;
	headSha?: string;
}

export interface ReviewShowLocalDiffResponse {}

export const ReviewShowLocalDiffRequestType = new RequestType<
	ReviewShowLocalDiffRequest,
	ReviewShowLocalDiffResponse,
	void,
	void
>(`${IpcRoutes.Host}/review/showLocalDiff`);

export interface ReviewCloseDiffRequest {}

export interface ReviewCloseDiffResponse {}

// this doesn't work yet due to limitations in vscode window handling
export const ReviewCloseDiffRequestType = new RequestType<
	ReviewCloseDiffRequest,
	ReviewCloseDiffResponse,
	void,
	void
>(`${IpcRoutes.Host}/review/closeDiff`);

export interface TraverseDiffsRequest {
	direction: "next" | "previous";
}

export interface TraverseDiffsResponse {}

export const TraverseDiffsRequestType = new RequestType<
	TraverseDiffsRequest,
	TraverseDiffsResponse,
	void,
	void
>(`${IpcRoutes.Host}/review/diffs/traverse`);

export interface ShowPreviousChangedFileRequest {}
export interface ShowNextChangedFileRequest {}
export interface ShowChangedFileResponse {}

export const ShowPreviousChangedFileRequestType = new RequestType<
	ShowPreviousChangedFileRequest,
	ShowChangedFileResponse,
	void,
	void
>(`${IpcRoutes.Host}/review/changedFiles/previous`);

export const ShowNextChangedFileRequestType = new RequestType<
	ShowNextChangedFileRequest,
	ShowChangedFileResponse,
	void,
	void
>(`${IpcRoutes.Host}/review/changedFiles/next`);
