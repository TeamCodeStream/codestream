"use strict";

import { InternalError, ServerError } from "agentError";
import { Response } from "node-fetch";
import {
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	ThirdPartyBuild,
	ThirdPartyBuildStatus,
} from "protocol/agent.protocol.providers";
import { CSCircleCIProviderInfo } from "protocol/api.protocol.models";
import { Logger } from "../logger";
import { Dates, log, lspProvider } from "../system";
import {
	CircleCIJobStatus,
	CircleCIJobStatusCount,
	CircleCIWorkflowStatus,
	GetCircleCIPipelinesResponse,
	GetCircleCIWorkflowsResponse,
	GetPipelinesResponse,
	GetPipelineWorkflowsResponse,
	GetWorkflowJobsResponse,
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

	getWorkflowUrl(workflowId: string): string {
		return `${this.appUrl}/pipelines/workflows/${workflowId}`;
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
			const response = await this.get<GetPipelineWorkflowsResponse>(
				`/pipeline/${pipelineId}/workflow`
			);
			if (response.body.items) {
				const workflows = response.body.items.map(w => ({
					id: w.id,
					name: w.name,
					status: w.status,
					createdAt: new Date(Date.parse(w.created_at)),
					stoppedAt: w.stopped_at ? new Date(Date.parse(w.stopped_at)) : undefined,
					url: this.getWorkflowUrl(w.id),
				}));
				return { workflows };
			}
			return {
				error: response.body.message,
			};
		} catch (error) {
			console.log(error);
			return {
				error,
			};
		}
	}

	@log()
	async getJobCounts(workflowId: string): Promise<CircleCIJobStatusCount> {
		// TODO: handle pagination
		try {
			const response = await this.get<GetWorkflowJobsResponse>(`/workflow/${workflowId}/job`);
			if (response.body.items) {
				const success = response.body.items.filter(j =>
					JobSuccessStatuses.includes(j.status)
				).length;
				const running = response.body.items.filter(j =>
					JobRunningStatuses.includes(j.status)
				).length;
				const waiting = response.body.items.filter(j =>
					JobWaitingStatuses.includes(j.status)
				).length;
				const error = response.body.items.filter(j => JobErrorStatuses.includes(j.status)).length;
				const total = response.body.items.length;
				const unknown = total - success - running - waiting - error;
				return {
					success,
					running,
					waiting,
					error,
					unknown,
					total,
				};
			}
			throw new Error(response.body.message);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	@log()
	async getPipelineWorkflows(
		projectSlug: string,
		branch: string
	): Promise<FetchThirdPartyBuildsResponse> {
		const pipelinesResult = await this.getPipelines(projectSlug, branch);
		const projects: { [key: string]: ThirdPartyBuild[] } = {};
		if (pipelinesResult.error || !pipelinesResult.pipelines) {
			return { projects };
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
				let status: ThirdPartyBuildStatus;
				let message: string;
				if (WorkflowSuccessStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Success;
					message = status;
				} else if (WorkflowErrorStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Failed;
					try {
						const jobCounts = await this.getJobCounts(workflow.id);
						message = `${jobCounts.error}/${jobCounts.total} jobs failed`;
					} catch (error) {
						message = "Failed";
					}
				} else if (WorkflowRunningStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Running;
					try {
						const jobCounts = await this.getJobCounts(workflow.id);
						const count = jobCounts.success + jobCounts.running;
						message = `Running (${count}/${jobCounts.total})`;
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
				projects[workflow.name].push({
					id: workflow.id,
					status,
					message,
					duration,
					finished,
					finishedRelative,
					url: workflow.url,
				});
			}
		}
		return { projects };
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
		return await this.getPipelineWorkflows(slug, request.branch);
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
