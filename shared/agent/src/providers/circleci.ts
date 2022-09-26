"use strict";

import {
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	ThirdPartyBuild,
	ThirdPartyBuildStatus,
} from "protocol/agent.protocol.providers";
import { CSCircleCIProviderInfo } from "protocol/api.protocol.models";
import { Dates, log, lspProvider } from "../system";
import {
	CircleCIWorkflow,
	CircleCIWorkflowStatus,
	GetCircleCIPipelinesResponse,
	GetCircleCIWorkflowsResponse,
} from "./circleci.types";
import { ThirdPartyBuildProviderBase } from "./thirdPartyBuildProviderBase";
import toFormatter = Dates.toFormatter;

const VCS_SLUG_MAPPING = [
	[/(?:^|\.)github\.com/i, "github"],
	[/(?:^|\.)gitlab\.com/i, "gitlab"],
	[/(?:^|\.)bitbucket\.org/i, "bitbucket"],
];

const SuccessStatuses = [CircleCIWorkflowStatus.Success];

const ErrorStatuses = [
	CircleCIWorkflowStatus.NotRun,
	CircleCIWorkflowStatus.Failed,
	CircleCIWorkflowStatus.Error,
	CircleCIWorkflowStatus.Failing,
	CircleCIWorkflowStatus.Cancelled,
	CircleCIWorkflowStatus.Unauthorized,
];

const RunningStatuses = [CircleCIWorkflowStatus.Running];

const WaitingStatuses = [CircleCIWorkflowStatus.OnHold];

@lspProvider("circleci")
export class CircleCIProvider extends ThirdPartyBuildProviderBase<CSCircleCIProviderInfo> {
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
			const response = await this.get<any>(`/project/${projectSlug}/pipeline`); // FIXME: types
			if (response.body.items) {
				return {
					pipelines: response.body.items
						.filter((x: any) => x.vcs.branch === branch)
						.map((x: any) => x.id),
				};
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
	async getWorkflowsByPipeline(pipelineId: string): Promise<GetCircleCIWorkflowsResponse> {
		try {
			const response = await this.get<any>(`/pipeline/${pipelineId}/workflow`); // FIXME: types
			if (response.body.items) {
				const workflows = response.body.items.map((w: any) => ({
					id: w.id,
					name: w.name,
					status: w.status,
					createdAt: Date.parse(w.created_at),
					stoppedAt: w.stopped_at ? Date.parse(w.stopped_at) : undefined,
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
	async getRunningWorkflowMessage(workflow: CircleCIWorkflow): Promise<string> {
		// TODO: handle pagination
		try {
			const response = await this.get<any>(`/workflow/${workflow.id}/job`);
			if (response.body.items) {
				const runningJobs = response.body.items.filter((j: any) => j.status === "running").length;
				const totalJobs = response.body.items.length;
				return `Running ${runningJobs}/${totalJobs} jobs`;
			}
		} catch (error) {
			console.log(error);
			return ThirdPartyBuildStatus.Running;
		}
		return ThirdPartyBuildStatus.Running;
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
				if (SuccessStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Success;
				} else if (ErrorStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Failed;
				} else if (RunningStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Running;
				} else if (WaitingStatuses.includes(workflow.status)) {
					status = ThirdPartyBuildStatus.Waiting;
				} else {
					status = ThirdPartyBuildStatus.Unknown;
				}
				const message = RunningStatuses.includes(workflow.status)
					? await this.getRunningWorkflowMessage(workflow)
					: status;
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
}
