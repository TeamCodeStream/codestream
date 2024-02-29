import {
	ChangeDataType,
	DidChangeDataNotificationType,
	DidChangeObservabilityDataNotificationType,
	GetReposScmRequestType,
	RelatedRepository,
	ReposScm,
} from "@codestream/protocols/agent";
import { CSCodeError } from "@codestream/protocols/api";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { logWarning } from "../../logger";
import { CodeStreamState } from "../../store";
import { getCodeError } from "../../store/codeErrors/reducer";
import Dismissable from "../Dismissable";
import { DropdownButton } from "../DropdownButton";
import { DelayedRender } from "../../Container/DelayedRender";
import { LoadingMessage } from "../../src/components/LoadingMessage";
import { isEmpty as _isEmpty } from "lodash-es";

const Ellipsize = styled.div`
	button {
		max-width: calc(100vw - 40px);
	}
`;

const ListItemCustom = styled.div`
	margin: 5px;
`;

export type EnhancedRepoScm = ReposScm & {
	/**
	 * name of the repo
	 */
	name: string;
	/**
	 * remote url
	 */
	remote: string;

	/** unique string */
	key: string;

	/** label for the repo -- may include the remote */
	label: string;
};

export function RepositoryAssociator(props: {
	error: { title: string; description: string };
	disableEmitDidChangeObservabilityDataNotification?: boolean;
	buttonText?: string;
	onSelected?: (r: EnhancedRepoScm) => void;
	onSubmit: (r: EnhancedRepoScm, skipTracking?: boolean) => void;
	onCancelled: (e?: React.MouseEvent) => void;
	isLoadingCallback?: (b: boolean) => void;
	isLoadingParent?: boolean;
	noSingleItemDropdownSkip?: boolean;
	relatedRepos?: RelatedRepository[];
}) {
	const derivedState = useSelector((state: CodeStreamState) => {
		const codeError = state.context.currentCodeErrorId
			? (getCodeError(state.codeErrors, state.context.currentCodeErrorId) as CSCodeError)
			: undefined;

		return {
			codeError: codeError,
			repos: state.repos,
			relatedRepos: props.relatedRepos || state.context.currentCodeErrorData?.relatedRepos,
		};
	});
	const { error: repositoryError } = props;

	const [openRepositories, setOpenRepositories] = React.useState<EnhancedRepoScm[] | undefined>(
		undefined
	);
	const [selected, setSelected] = React.useState<EnhancedRepoScm | undefined>(undefined);
	const [multiRemoteRepository, setMultiRemoteRepository] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const [hasFetchedRepos, setHasFetchedRepos] = React.useState(false);
	const [skipRender, setSkipRender] = React.useState(false);

	const fetchRepos = () => {
		HostApi.instance
			.send(GetReposScmRequestType, {
				inEditorOnly: true,
				includeRemotes: true,
			})
			.then(_ => {
				if (!_.repositories) return;

				const results: EnhancedRepoScm[] = [];
				for (const repo of _.repositories) {
					if (repo.remotes) {
						for (const e of repo.remotes) {
							const id = repo.id || "";
							const remoteUrl = e.rawUrl;
							if (!remoteUrl || !id) continue;

							const name = derivedState.repos[id] ? derivedState.repos[id].name : "repo";
							const label = `${name} (${remoteUrl})`;
							results.push({
								...repo,
								key: btoa(remoteUrl!),
								remote: remoteUrl!,
								label: label,
								name: name,
							});
						}
						if (repo.remotes.length > 1) {
							setMultiRemoteRepository(true);
						}
					}
				}
				//take repos in users IDE, and filter them with a list of
				//related repos to service entity the error originates from
				let filteredResults: EnhancedRepoScm[];
				if (!_isEmpty(derivedState.relatedRepos)) {
					filteredResults = results.filter(_ => {
						return derivedState.relatedRepos?.some(repo => {
							const lowercaseRepoRemotes = repo.remotes.map(remote => remote.toLowerCase());
							const lowercaseCurrentRemote = _.remote.toLowerCase();
							return lowercaseRepoRemotes.includes(lowercaseCurrentRemote);
						});
					});
				} else {
					// no related repo data for whatever reason, just show repos
					// instead of "repo not found" error
					filteredResults = results;
				}
				if (filteredResults.length === 1 && !props.noSingleItemDropdownSkip) {
					setSelected(filteredResults[0]);
					setSkipRender(true);
					//no dropdown required, just go to error and auto select the single result
					handleOnSubmitWithOneItemInDropdown(filteredResults[0]);
				} else {
					setOpenRepositories(filteredResults);
				}
				if (props.isLoadingCallback) {
					props.isLoadingCallback(false);
				}
				setTimeout(() => {
					setHasFetchedRepos(true);
				}, 200);
			})
			.catch(e => {
				if (props.isLoadingCallback) {
					props.isLoadingCallback(false);
				}
				logWarning(`could not get repos: ${e.message}`);
				setTimeout(() => {
					setHasFetchedRepos(true);
				}, 200);
			});
	};

	useDidMount(() => {
		if (props.isLoadingCallback) {
			props.isLoadingCallback(true);
		}
		if (!repositoryError) return;

		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (e.type === ChangeDataType.Workspace) {
				fetchRepos();
			}
		});

		fetchRepos();

		return () => {
			disposable && disposable.dispose();
		};
	});

	if (openRepositories?.length === 0) {
		return (
			<Dismissable
				title={`Repository Not Found`}
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							props.onCancelled(e);
						},
					},
				]}
			>
				{_isEmpty(derivedState.relatedRepos) && (
					<p>Could not locate any open repositories. Please open a repository and try again.</p>
				)}
				{!_isEmpty(derivedState.relatedRepos) && (
					<>
						<p>
							Could not locate any open repositories. Please open one of the following repositories
							and try again:
						</p>
						<ul>
							{derivedState.relatedRepos.map((_, index) => (
								<ListItemCustom key={`${index}_${_.name}`}>&#8226; {_.name}</ListItemCustom>
							))}
						</ul>
					</>
				)}
			</Dismissable>
		);
	}

	const handleOnSubmitWithOneItemInDropdown = async repo => {
		setIsLoading(true);

		await props.onSubmit(repo, true);
		if (!props.disableEmitDidChangeObservabilityDataNotification) {
			HostApi.instance.emit(DidChangeObservabilityDataNotificationType.method, {
				type: "RepositoryAssociation",
			});
		}
		setIsLoading(false);
	};

	if (hasFetchedRepos && !props.isLoadingParent && !skipRender) {
		return (
			<Dismissable
				title={repositoryError.title}
				buttons={[
					{
						text: props.buttonText || "Associate",
						loading: isLoading,
						onClick: async e => {
							setIsLoading(true);
							e.preventDefault();

							await props.onSubmit(selected!);
							if (!props.disableEmitDidChangeObservabilityDataNotification) {
								HostApi.instance.emit(DidChangeObservabilityDataNotificationType.method, {
									type: "RepositoryAssociation",
								});
							}
							setIsLoading(false);
						},
						disabled: !selected,
					},
					{
						text: "Cancel",
						isSecondary: true,
						onClick: e => {
							e.preventDefault();
							props.onCancelled(e);
						},
					},
				]}
			>
				<p>{repositoryError.description}</p>
				{multiRemoteRepository && (
					<p>If this is a forked repository, please select the upstream remote.</p>
				)}
				<Ellipsize>
					<DropdownButton
						items={
							openRepositories
								?.sort((a, b) => a.label.localeCompare(b.label))
								.map(remote => {
									return {
										key: remote.key,
										label: remote.label,
										action: () => {
											setSelected(remote);
											props.onSelected && props.onSelected(remote);
										},
									};
								}) || []
						}
						selectedKey={selected ? selected.id : undefined}
						variant={selected ? "secondary" : "primary"}
						wrap
					>
						{selected ? selected.name : "Select a Repository"}
					</DropdownButton>
				</Ellipsize>
			</Dismissable>
		);
	} else {
		return (
			<DelayedRender>
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<LoadingMessage>Loading Error Group...</LoadingMessage>
				</div>
			</DelayedRender>
		);
	}
}
