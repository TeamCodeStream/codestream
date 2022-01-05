import React from "react";
import { useSelector } from "react-redux";
import { CodeStreamState } from "../../store";
import { getCodeError } from "../../store/codeErrors/reducer";
import Dismissable from "../Dismissable";
import {
	ChangeDataType,
	DidChangeDataNotificationType,
	DidChangeObservabilityDataNotificationType,
	GetReposScmRequestType,
	ReposScm
} from "@codestream/protocols/agent";
import { HostApi } from "../../";
import { CSCodeError } from "@codestream/protocols/api";
import { logWarning } from "../../logger";
import { DropdownButton } from "../DropdownButton";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import styled from "styled-components";

const Ellipsize = styled.div`
	button {
		max-width: calc(100vw - 40px);
	}
`;

interface EnhancedRepoScm {
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
}

export function RepositoryAssociator(props: {
	error: { title: string; description: string };
	disableEmitDidChangeObservabilityDataNotification?: boolean;
	buttonText?: string;
	onSelected?: Function;
	onSubmit: Function;
	onCancelled: Function;
}) {
	const derivedState = useSelector((state: CodeStreamState) => {
		const codeError = state.context.currentCodeErrorId
			? (getCodeError(state.codeErrors, state.context.currentCodeErrorId) as CSCodeError)
			: undefined;

		return {
			codeError: codeError,
			repos: state.repos
		};
	});
	const { error: repositoryError } = props;

	const [openRepositories, setOpenRepositories] = React.useState<
		(ReposScm & EnhancedRepoScm)[] | undefined
	>(undefined);
	const [selected, setSelected] = React.useState<any>(undefined);
	const [multiRemoteRepository, setMultiRemoteRepository] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	const fetchRepos = () => {
		HostApi.instance
			.send(GetReposScmRequestType, {
				inEditorOnly: true,
				includeRemotes: true
			})
			.then(_ => {
				if (!_.repositories) return;

				const results: (ReposScm & EnhancedRepoScm)[] = [];
				for (const repo of _.repositories) {
					if (repo.remotes && repo.remotes.length > 1) {
						for (const e of repo.remotes) {
							const id = repo.id || "";
							if (!e.types || !id) continue;
							const remoteUrl = e.types?.find(_ => _.type === "fetch")?.url;
							if (!remoteUrl) continue;

							const name = derivedState.repos[id] ? derivedState.repos[id].name : "repo";
							const label = `${name} (${remoteUrl})`;
							results.push({
								...repo,
								remote: remoteUrl!,
								key: btoa(remoteUrl!),
								label: label,
								name: name
							});
						}
						setMultiRemoteRepository(true);
					} else {
						const id = repo.id || "";
						if (!repo.remotes || !repo.remotes[0].types || !id) continue;
						const url = repo.remotes[0].types.find(_ => _.type === "fetch")?.url!;
						const name = derivedState.repos[id] ? derivedState.repos[id].name : "repo";
						const label = `${name} (${url})`;
						results.push({
							...repo,
							key: btoa(url),
							remote: url,
							label: label,
							name: name
						});
					}
				}

				setOpenRepositories(results);
			})
			.catch(e => {
				logWarning(`could not get repos: ${e.message}`);
			});
	};

	useDidMount(() => {
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
				title={repositoryError.title}
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							props.onCancelled(e);
						}
					}
				]}
			>
				<p>Could not locate any open repositories. Please open a repository and try again.</p>
			</Dismissable>
		);
	}

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

						await props.onSubmit(selected);
						if (!props.disableEmitDidChangeObservabilityDataNotification) {
							HostApi.instance.emit(DidChangeObservabilityDataNotificationType.method, {
								type: "RepositoryAssociation"
							});
						}
						setIsLoading(false);
					},
					disabled: !selected
				},
				{
					text: "Cancel",
					isSecondary: true,
					onClick: e => {
						e.preventDefault();
						props.onCancelled(e);
					}
				}
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
									}
								};
							}) || []
					}
					selectedKey={selected ? selected.id : null}
					variant={selected ? "secondary" : "primary"}
					size="compact"
					wrap
				>
					{selected ? selected.name : "select a repository"}
				</DropdownButton>
			</Ellipsize>
		</Dismissable>
	);
}
