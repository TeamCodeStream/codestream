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
	Cancelled = "cancelled",
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
