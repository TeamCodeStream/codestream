"use strict";

import {
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	ThirdPartyBuild,
	ThirdPartyBuildStatus,
} from "@codestream/protocols/agent";
import { CSCircleCIProviderInfo } from "@codestream/protocols/api";
import { Response } from "undici";

import { InternalError, ServerError } from "agentError";
import { Logger } from "../logger";
import { Dates, log, lspProvider } from "../system";
import {
	CircleCIApiJobItem,
	CircleCIApiWorkflowItem,
	CircleCIJob,
	CircleCIJobStatus,
	CircleCIJobStatusCount,
	CircleCIWorkflowStatus,
	GetCircleCIJobsResponse,
	GetCircleCIPipelinesResponse,
	GetCircleCIWorkflowsResponse,
	GetPipelinesResponse,
	PaginatedCircleCIItemsResponse,
} from "./circleci.types";
import { ApiResponse } from "./provider";
import { ThirdPartyBuildProviderBase } from "./thirdPartyBuildProviderBase";

import toFormatter = Dates.toFormatter;

const VCS_SLUG_MAPPING = [
	[/(?:^|\.)github\.com/i, "github"],
	[/(?:^|\.)gitlab\.com/i, "gitlab"],
	[/(?:^|\.)bitbucket\.org/i, "bitbucket"],
];

const WorkflowSuccessStatuses = [CircleCIWorkflowStatus.Success];

const WorkflowErrorStatuses = [
	CircleCIWorkflowStatus.NotRun,
	CircleCIWorkflowStatus.Failed,
	CircleCIWorkflowStatus.Error,
	CircleCIWorkflowStatus.Failing,
	CircleCIWorkflowStatus.Canceled,
	CircleCIWorkflowStatus.Unauthorized,
];

const WorkflowRunningStatuses = [CircleCIWorkflowStatus.Running];

const WorkflowWaitingStatuses = [CircleCIWorkflowStatus.OnHold];

const JobSuccessStatuses = [CircleCIJobStatus.Success];

const JobRunningStatuses = [CircleCIJobStatus.Running];

const JobWaitingStatuses = [CircleCIJobStatus.Queued, CircleCIJobStatus.OnHold];

const JobErrorStatuses = [
	CircleCIJobStatus.NotRun,
	CircleCIJobStatus.Failed,
	CircleCIJobStatus.Retried,
	CircleCIJobStatus.NotRunning,
	CircleCIJobStatus.InfrastructureFail,
	CircleCIJobStatus.TimedOut,
	CircleCIJobStatus.TerminatedUnknown,
	CircleCIJobStatus.Blocked,
	CircleCIJobStatus.Canceled,
	CircleCIJobStatus.Unauthorized,
];

@lspProvider("circleci")
export class CircleCIProvider extends ThirdPartyBuildProviderBase<CSCircleCIProviderInfo> {
	delay: Date | undefined;

	get displayName() {
		return "CircleCI";
	}

	get name() {
		return "circleci";
	}

	get headers() {
		return {
			Accept: "application/json",
			"Circle-Token": `${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	get apiPath() {
		return "/api/v2";
	}

	get apiUrl() {
		return "https://circleci.com";
	}

	get appUrl() {
		return "https://app.circleci.com";
	}

	get baseUrl() {
		return `${this.apiUrl}/${this.apiPath}`;
	}

	async *getItemsPaginated<R>(url: string): AsyncIterable<R> {
		let response: ApiResponse<PaginatedCircleCIItemsResponse<R>>;
		let actualUrl: string | undefined = url;
		do {
			response = await this.get<PaginatedCircleCIItemsResponse<R>>(actualUrl);
			if (response.body.items) {
				for (const item of response.body.items) {
					yield item;
				}
				if (response.body.next_page_token) {
					actualUrl = `${url}?page-token=${response.body.next_page_token}`;
				} else {
					actualUrl = undefined;
				}
			} else {
				throw new Error(response.body.message);
			}
		} while (actualUrl);
	}

	getDashboardUrl(projectSlug: string, branch: string) {
		return `${this.appUrl}/pipelines/${projectSlug}?branch=${branch}`;
	}

	getWorkflowUrl(workflowId: string): string {
		return `${this.appUrl}/pipelines/workflows/${workflowId}`;
	}

	getJobUrl(
		projectSlug: string,
		pipelineNumber: number,
		workflowId: string,
		jobNumber: number
	): string {
		return `${this.appUrl}/pipelines/${projectSlug}/${pipelineNumber}/workflows/${workflowId}/jobs/${jobNumber}`;
	}

	@log()
	async getPipelines(projectSlug: string, branch: string): Promise<GetCircleCIPipelinesResponse> {
		try {
			const response = await this.get<GetPipelinesResponse>(`/project/${projectSlug}/pipeline`);
			if (response.body.items) {
				return {
					pipelines: response.body.items.filter(x => x.vcs?.branch === branch).map(x => x.id),
				};
			}
			return {
				error: response.body.message,
			};
		} catch (error) {
			Logger.error(error);
			return {
				error,
			};
		}
	}

	@log()
	async getWorkflowsByPipeline(pipelineId: string): Promise<GetCircleCIWorkflowsResponse> {
		try {
			const workflows = [];
			const response = this.getItemsPaginated<CircleCIApiWorkflowItem>(
				`/pipeline/${pipelineId}/workflow`
			);
			for await (const w of response) {
				let jobs: CircleCIJob[] = [];
				let jobCounts: CircleCIJobStatusCount | undefined = undefined;
				try {
					const jobsResponse = await this.getJobsByWorkflow(w.id, w.pipeline_number);
					jobs = jobsResponse.jobs || [];
					jobCounts = jobsResponse.counts;
				} catch (error) {
					console.error(error);
				}
				workflows.push({
					id: w.id,
					name: w.name,
					status: w.status,
					createdAt: new Date(Date.parse(w.created_at)),
					stoppedAt: w.stopped_at ? new Date(Date.parse(w.stopped_at)) : undefined,
					jobs,
					jobCounts,
					url: this.getWorkflowUrl(w.id),
				});
			}
			return { workflows };
		} catch (error) {
			console.log(error);
			return {
				error,
			};
		}
	}

	@log()
	async getJobsByWorkflow(
		workflowId: string,
		pipelineNumber: number
	): Promise<GetCircleCIJobsResponse> {
		try {
			const jobs = [];
			const response = this.getItemsPaginated<CircleCIApiJobItem>(`/workflow/${workflowId}/job`);
			for await (const j of response) {
				jobs.push({
					id: j.id,
					name: j.name,
					status: j.status,
					createdAt: new Date(Date.parse(j.created_at)),
					stoppedAt: j.stopped_at ? new Date(Date.parse(j.stopped_at)) : undefined,
					url: this.getJobUrl(j.project_slug, pipelineNumber, j.id, j.job_number),
				});
			}
			return this.sortJobsByType(jobs);
		} catch (error) {
			return {
				error,
			};
		}
	}

	sortJobsByType(jobs: CircleCIJob[]): GetCircleCIJobsResponse {
		const success = jobs.filter(j => JobSuccessStatuses.includes(j.status));
		const running = jobs.filter(j => JobRunningStatuses.includes(j.status));
		const error = jobs.filter(j => JobErrorStatuses.includes(j.status));
		const waiting = jobs.filter(j => JobWaitingStatuses.includes(j.status));
		const unknown = jobs.filter(
			j =>
				!JobSuccessStatuses.includes(j.status) &&
				!JobRunningStatuses.includes(j.status) &&
				!JobErrorStatuses.includes(j.status) &&
				!JobWaitingStatuses.includes(j.status)
		);
		return {
			jobs: running.concat(error, waiting, unknown, success),
			counts: {
				success: success.length,
				running: running.length,
				error: error.length,
				waiting: waiting.length,
				unknown: unknown.length,
				total: jobs.length,
			},
		};
	}

	@log()
	async getPipelineWorkflows(
		projectSlug: string,
		branch: string
	): Promise<{
		[key: string]: ThirdPartyBuild[];
	}> {
		const pipelinesResult = await this.getPipelines(projectSlug, branch);
		const projects: { [key: string]: ThirdPartyBuild[] } = {};
		if (pipelinesResult.error || !pipelinesResult.pipelines) {
			return projects;
		}
		for (const pipelineId of pipelinesResult.pipelines.slice(0, 5)) {
			const workflowResult = await this.getWorkflowsByPipeline(pipelineId);
			if (workflowResult.error || !workflowResult.workflows) {
				continue;
			}
			for (const workflow of workflowResult.workflows) {
				if (!projects[workflow.name]) {
					projects[workflow.name] = [];
				}
				if (projects[workflow.name].length >= 5) continue;
				let status: ThirdPartyBuildStatus;
				let message: string;
				if (WorkflowSuccessStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Success;
					message = status;
				} else if (WorkflowErrorStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Failed;
					try {
						const jobCounts = workflow.jobCounts;
						message = jobCounts ? `${jobCounts.error}/${jobCounts.total} jobs failed` : "Failed";
					} catch (error) {
						message = "Failed";
					}
				} else if (WorkflowRunningStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Running;
					try {
						const jobCounts = workflow.jobCounts;
						message = jobCounts
							? `Running (${jobCounts.success + jobCounts.running}/${jobCounts.total})`
							: "Running";
					} catch (error) {
						message = "Running";
					}
				} else if (WorkflowWaitingStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Waiting;
					message = status;
				} else {
					status = ThirdPartyBuildStatus.Unknown;
					message = status;
				}
				const duration = workflow.stoppedAt
					? this.formatDuration(workflow.createdAt, workflow.stoppedAt)
					: this.formatDuration(workflow.createdAt, new Date());
				const finished = workflow.stoppedAt;
				const finishedRelative = workflow.stoppedAt
					? toFormatter(workflow.stoppedAt).fromNow()
					: undefined;
				const builds = workflow.jobs.map(this.jobToBuild.bind(this));
				projects[workflow.name].push({
					id: workflow.id,
					status,
					message,
					duration,
					finished,
					finishedRelative,
					builds,
					url: workflow.url,
				});
			}
		}
		return projects;
	}

	jobToBuild(job: CircleCIJob): ThirdPartyBuild {
		let status: ThirdPartyBuildStatus;
		let message: string;
		if (JobSuccessStatuses.includes(job.status)) {
			status = ThirdPartyBuildStatus.Success;
			message = `Job "${job.name}" succeeded`;
		} else if (JobErrorStatuses.includes(job.status)) {
			status = ThirdPartyBuildStatus.Failed;
			message = `Job "${job.name}" failed: ${job.status}`;
		} else if (JobRunningStatuses.includes(job.status)) {
			status = ThirdPartyBuildStatus.Running;
			message = `Job "${job.name}" is running`;
		} else if (JobWaitingStatuses.includes(job.status)) {
			status = ThirdPartyBuildStatus.Waiting;
			message = `Job "${job.name}" is waiting`;
		} else {
			status = ThirdPartyBuildStatus.Unknown;
			message = `Job "${job.name}" has unknown status`;
		}
		const duration = job.stoppedAt
			? this.formatDuration(job.createdAt, job.stoppedAt)
			: this.formatDuration(job.createdAt, new Date());
		const finished = job.stoppedAt;
		const finishedRelative = job.stoppedAt ? toFormatter(job.stoppedAt).fromNow() : undefined;
		return {
			id: job.id,
			status,
			message,
			duration,
			finished,
			finishedRelative,
			builds: [],
			url: job.url,
			artifactsUrl: `${job.url}/artifacts`,
		};
	}

	getSlug(remote: { domain: string; path: string }): string | undefined {
		const { domain, path } = remote;
		for (const [re, slug] of VCS_SLUG_MAPPING) {
			if (domain.match(re)) {
				return `${slug}/${path}`;
			}
		}
		return undefined;
	}

	@log()
	async fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse> {
		const slug = this.getSlug(request.remote);
		if (!slug) {
			return { projects: {} };
		}
		const projects = await this.getPipelineWorkflows(slug, request.branch);
		const dashboardUrl = this.getDashboardUrl(slug, request.branch);
		return {
			projects,
			dashboardUrl,
		};
	}

	formatDuration(from: Date, to: Date): string {
		const totalSeconds = Math.floor((+to - +from) / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
		const seconds = totalSeconds - hours * 3600 - minutes * 60;
		return [
			hours > 0 ? `${hours}h` : undefined,
			minutes > 0 ? `${minutes}m` : undefined,
			seconds > 0 ? `${seconds}s` : undefined,
		]
			.filter(Boolean)
			.join(" ");
	}

	protected async get<R extends object>(
		url: string,
		headers?: { [key: string]: string },
		options?: { [key: string]: any },
		ensureConnected?: boolean
	): Promise<ApiResponse<R>> {
		if (this.delay && +this.delay > Date.now()) {
			throw new InternalError(
				`Requests to CircleCI are rate-limited, waiting until ${this.delay.toUTCString()} before making more requests`
			);
		}
		return super.get(url, headers, options, ensureConnected);
	}

	protected async handleErrorResponse(response: Response): Promise<Error> {
		const superError = await super.handleErrorResponse(response);
		if (response.status === 429) {
			const retryAfter = response.headers.get("retry-after") || 0;
			const info = {
				retryAfter: +retryAfter * 1000,
			};
			Logger.log(
				`Rate limiting is in effect for CircleCI; delaying for ${retryAfter} seconds before making further requests`
			);
			this.delay = new Date(Math.max(+(this.delay || 0), Date.now() + info.retryAfter));
			const error = new ServerError(superError.message, info, 429);
			error.innerError = superError;
			return error;
		}
		return superError;
	}
}
