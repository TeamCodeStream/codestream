export interface GetCircleCIPipelinesResponse {
	pipelines?: string[];
	error?: string;
}

export enum CircleCIWorkflowStatus {
	Success = "success",
	Running = "running",
	NotRun = "not_run",
	Failed = "failed",
	Error = "error",
	Failing = "failing",
	OnHold = "on_hold",
	Canceled = "canceled",
	Unauthorized = "unauthorized",
}

export enum CircleCIJobStatus {
	Success = "success",
	Running = "running",
	NotRun = "not_run",
	Failed = "failed",
	Retried = "retried",
	Queued = "queued",
	NotRunning = "not_running",
	InfrastructureFail = "infrastructure_fail",
	TimedOut = "timedout",
	OnHold = "on_hold",
	TerminatedUnknown = "terminated-unknown",
	Blocked = "blocked",
	Canceled = "canceled",
	Unauthorized = "unauthorized",
}

export interface CircleCIStatusObject {
	id: string;
	name: string;
	createdAt: Date;
	stoppedAt?: Date;
	url?: string;
}

export interface CircleCIJobStatusCount {
	error: number;
	running: number;
	success: number;
	waiting: number;
	unknown: number;
	total: number;
}

export type CircleCIWorkflow = CircleCIStatusObject & {
	status: CircleCIWorkflowStatus;
	jobs: CircleCIJob[];
	jobCounts?: CircleCIJobStatusCount;
};

export type CircleCIJob = CircleCIStatusObject & {
	status: CircleCIJobStatus;
};

export interface GetCircleCIWorkflowsResponse {
	workflows?: CircleCIWorkflow[];
	error?: string;
}

export interface GetCircleCIJobsResponse {
	jobs?: CircleCIJob[];
	counts?: CircleCIJobStatusCount;
	error?: string;
}

export interface GetPipelinesResponse {
	items?: {
		id: string;
		number: number;
		vcs?: {
			branch?: string;
		};
	}[];
	message?: string;
}

export interface CircleCIApiWorkflowItem {
	id: string;
	name: string;
	status: CircleCIWorkflowStatus;
	created_at: string;
	stopped_at: string;
	pipeline_number: number;
}

export interface CircleCIApiJobItem {
	id: string;
	name: string;
	status: CircleCIJobStatus;
	created_at: string;
	stopped_at: string;
	job_number: number;
	project_slug: string;
}

export interface PaginatedCircleCIItemsResponse<R> {
	items?: R[];
	message?: string;
	next_page_token?: string;
}
