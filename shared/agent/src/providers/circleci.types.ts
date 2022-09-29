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

export interface CircleCIWorkflow {
	id: string;
	name: string;
	status: CircleCIWorkflowStatus;
	createdAt: Date;
	stoppedAt?: Date;
	url?: string;
}

export interface GetCircleCIWorkflowsResponse {
	workflows?: CircleCIWorkflow[];
	error?: string;
}

export interface CircleCIJobStatusCount {
	error: number;
	running: number;
	success: number;
	waiting: number;
	unknown: number;
	total: number;
}

export interface GetPipelinesResponse {
	items?: {
		id: string;
		vcs?: {
			branch?: string;
		};
	}[];
	message?: string;
}

export interface GetPipelineWorkflowsResponse {
	items?: {
		id: string;
		name: string;
		status: CircleCIWorkflowStatus;
		created_at: string;
		stopped_at: string;
	}[];
	message?: string;
}

export interface GetWorkflowJobsResponse {
	items?: {
		status: CircleCIJobStatus;
	}[];
	message?: string;
}
