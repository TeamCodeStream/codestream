import {
	FetchThirdPartyBuildsRequestType,
	ReposScm,
	ThirdPartyBuild,
	ThirdPartyBuildStatus,
} from "@codestream/protocols/agent";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { WebviewPanels } from "../../ipc/webview.protocol.common";
import { PaneBody, PaneHeader, PaneState } from "../../src/components/Pane";
import Icon from "../Icon";
import { CircleCIBuilds } from "./CircleCIBuilds";
import { ConnectCICD } from "./ConnectCICD";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

interface Projects {
	[providerId: string]: {
		[projectId: string]: ThirdPartyBuild[];
	};
}

interface DashboardUrls {
	[providerId: string]: string;
}

const INACTIVE_REFRESH_INTERVAL = 60 * 1000; // refresh data every minute by default
const ACTIVE_REFRESH_INTERVAL = 15 * 1000; // when a build is running/pending, refresh data every 15 seconds

export const CICD = (props: Props) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { editorContext, providers } = state;
		const providerInfo: { [key: string]: object | undefined } = {};
		for (const provider of ["circleci*com"]) {
			const name = providers[provider]?.name;
			if (name) {
				const p = getUserProviderInfoFromState(name, state);
				if (p) providerInfo[name] = p;
			}
		}

		const currentRepoId = editorContext.scmInfo?.scm?.repoId;
		const currentRepo = props.openRepos.find(_ => _.id === currentRepoId);

		return {
			bootstrapped: Object.keys(providerInfo).length > 0,
			providerInfo,
			providers,
			currentRepo,
			currentBranch: editorContext.scmInfo?.scm?.branch,
		};
	}, shallowEqual);
	const [loading, setLoading] = useState(false);
	const [refresh, setRefresh] = useState(false);
	const [refreshTimeout, setRefreshTimeout] = useState<number>();
	const [projects, setProjects] = useState<Projects>({});
	const [dashboardUrls, setDashboardUrls] = useState<DashboardUrls>({});

	const scheduleRefresh = (active: boolean) => {
		const timeout = active ? ACTIVE_REFRESH_INTERVAL : INACTIVE_REFRESH_INTERVAL;
		const id = window.setTimeout(() => setRefresh(true), timeout);
		setRefreshTimeout(id);
	};

	const fetchProjects = async () => {
		if (refreshTimeout) clearTimeout(refreshTimeout);
		if (loading) return;
		setLoading(true);
		if (!derivedState.currentRepo) {
			scheduleRefresh(false);
			setLoading(false);
			return;
		}
		const remotes = derivedState.currentRepo.remotes || [];
		const projects: Projects = {};
		const dashboardUrls: DashboardUrls = {};
		for (const [providerId, provider] of Object.entries(derivedState.providers)) {
			if (!Object.keys(derivedState.providerInfo).includes(provider.name)) continue;
			for (const remote of remotes) {
				try {
					const result = await HostApi.instance.send(FetchThirdPartyBuildsRequestType, {
						providerId,
						remote,
						branch: derivedState.currentBranch || "",
					});
					if (result.projects) {
						projects[provider.name] = result.projects;
						if (result.dashboardUrl) {
							dashboardUrls[provider.name] = result.dashboardUrl;
						}
						break;
					}
				} catch (error) {
					console.error(error);
				}
			}
		}

		// if there are any builds in progress, schedule next refresh sooner
		const buildsInProgress =
			Object.values(projects)
				.map(indexedBuild =>
					Object.values(indexedBuild)
						.flat()
						.find(
							x =>
								x.status === ThirdPartyBuildStatus.Running ||
								x.status === ThirdPartyBuildStatus.Waiting
						)
				)
				.find(Boolean) !== undefined;
		scheduleRefresh(buildsInProgress);
		setRefresh(false);
		setProjects(projects);
		setDashboardUrls(dashboardUrls);
		setLoading(false);
	};

	// force a re-fetch if branch or repo changes
	useEffect(() => {
		fetchProjects().catch(error => {
			console.error(error);
		});
	}, [derivedState.currentBranch, derivedState.currentRepo]);

	useEffect(() => {
		if (!refresh || props.paneState === PaneState.Collapsed) return;
		fetchProjects().catch(error => {
			console.error(error);
		});
	}, [
		derivedState.currentRepo,
		derivedState.currentBranch,
		derivedState.providers,
		derivedState.providerInfo,
		refresh,
		props.paneState,
	]);

	return (
		<>
			<PaneHeader
				title="CI/CD"
				id={WebviewPanels.CICD}
				isLoading={loading}
				subtitle={
					derivedState.currentRepo && (
						<>
							<span>
								<Icon
									name="repo"
									className="inline-label"
									style={{ transform: "scale(0.7)", display: "inline-block" }}
								/>
								{derivedState.currentRepo.folder.name}
							</span>
							{derivedState.currentBranch && (
								<span>
									<Icon
										name="git-branch"
										className="inline-label"
										style={{ transform: "scale(0.7)", display: "inline-block" }}
									/>
									{derivedState.currentBranch}
								</span>
							)}
						</>
					)
				}
			>
				{derivedState.bootstrapped && (
					<Icon
						name="refresh"
						title="Refresh"
						placement="bottom"
						delay={1}
						onClick={e => {
							fetchProjects();
						}}
					/>
				)}
				{derivedState.bootstrapped && dashboardUrls.circleci && (
					<Icon
						name="link-external"
						title="View Dashboard on CircleCI"
						placement="bottom"
						delay={1}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.send(OpenUrlRequestType, { url: dashboardUrls.circleci });
						}}
					/>
				)}
			</PaneHeader>
			{props.paneState != PaneState.Collapsed && (
				<PaneBody key="ci-cd">
					{!derivedState.bootstrapped && <ConnectCICD />}
					{derivedState.bootstrapped && projects.circleci && (
						<CircleCIBuilds projects={projects.circleci} />
					)}
					{derivedState.bootstrapped && !loading && Object.keys(projects).length === 0 && (
						<div style={{ padding: "0 20px 0 40px" }}>No builds found for branch on repo.</div>
					)}
				</PaneBody>
			)}
		</>
	);
};
