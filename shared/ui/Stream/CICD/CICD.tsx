import {
	FetchThirdPartyBuildsRequestType,
	ReposScm,
	ThirdPartyBuild,
} from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React, { Reducer, useReducer, useState } from "react";
import { useSelector } from "react-redux";
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

export const CICD = (props: Props) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { editorContext, providers } = state;
		const providerInfo: { [key: string]: object | undefined } = {};
		for (const provider of ["circleci*com"]) {
			const name = providers[provider]?.name;
			if (name) providerInfo[name] = getUserProviderInfoFromState(name, state);
		}

		const currentRepoId = editorContext.scmInfo?.scm?.repoId;
		const currentRepo = props.openRepos.find(_ => _.id === currentRepoId);

		return {
			bootstrapped: Object.keys(providerInfo).length > 0,
			providerInfo,
			providers,
			currentRepo,
		};
	});
	const [loading, setLoading] = useState(true);
	const [projects, setProjectsForProvider] = useReducer<
		Reducer<Projects, { provider: string; projects: { [key: string]: ThirdPartyBuild[] } }>
	>(
		(state, action) => ({
			...state,
			[action.provider]: action.projects,
		}),
		{}
	);

	const fetchProjects = async () => {
		setLoading(true);
		if (!derivedState.currentRepo) {
			setLoading(false);
			return;
		}
		const remotes = derivedState.currentRepo.remotes || [];
		for (const [providerId, provider] of Object.entries(derivedState.providers)) {
			if (!Object.keys(derivedState.providerInfo).includes(provider.name)) continue;
			for (const remote of remotes) {
				const result = await HostApi.instance.send(FetchThirdPartyBuildsRequestType, {
					providerId,
					remote,
				});
				if (result.projects) {
					setProjectsForProvider({ provider: provider.name, projects: result.projects });
					break;
				}
			}
		}
		setLoading(false);
	};

	useDidMount(() => {
		fetchProjects().catch(error => {
			console.log(error);
		});
	});

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
							{derivedState.currentRepo.currentBranch && (
								<span>
									<Icon
										name="git-branch"
										className="inline-label"
										style={{ transform: "scale(0.7)", display: "inline-block" }}
									/>
									{derivedState.currentRepo.currentBranch}
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
			</PaneHeader>
			{props.paneState != PaneState.Collapsed && (
				<PaneBody key="ci-cd">
					{!derivedState.bootstrapped && <ConnectCICD />}
					{derivedState.bootstrapped && projects.circleci && (
						<CircleCIBuilds projects={projects.circleci} />
					)}
				</PaneBody>
			)}
		</>
	);
};
