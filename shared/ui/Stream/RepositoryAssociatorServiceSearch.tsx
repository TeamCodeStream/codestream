import {
	EntityAccount,
	GetObservabilityEntitiesRequestType,
	WarningOrError,
	GetReposScmRequestType,
	ReposScm,
	DidChangeDataNotificationType,
	ChangeDataType,
} from "@codestream/protocols/agent";
import React, { PropsWithChildren, useState } from "react";
import { components, OptionProps } from "react-select";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { HostApi } from "@codestream/webview/webview-api";
import { api } from "@codestream/webview/store/codeErrors/thunks";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { NoContent } from "../src/components/Pane";
import { useAppDispatch } from "../utilities/hooks";
import { isEmpty as _isEmpty } from "lodash";
import { DropdownWithSearch } from "./DropdownWithSearch";
import { useResizeDetector } from "react-resize-detector";
import { CodeStreamState } from "../store";
import { logWarning } from "../logger";
import { useDidMount } from "@codestream/webview/utilities/hooks";

interface RepositoryAssociatorServiceSearchProps {
	title?: string;
	label?: string | React.ReactNode;
	remote?: string;
	remoteName?: string;
	onSuccess?: (entityGuid: { entityGuid: string }) => void;
	servicesToExcludeFromSearch?: EntityAccount[];
	isSidebarView?: boolean;
	isServiceSearch?: boolean;
}

type SelectOptionType = { label: string; value: string };

type AdditionalType = { nextCursor?: string };

export type EnhancedRepoScm = ReposScm & {
	name: string;
	remote: string;
	key: string;
	label: string;
};

const OptionName = styled.div`
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
`;

const OptionType = styled.span`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const OptionAccount = styled.div`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const Option = (props: OptionProps) => {
	const children = (
		<>
			<OptionName>
				{props.data?.label} <OptionType>{props.data?.labelAppend}</OptionType>
			</OptionName>
			<OptionAccount>{props.data?.sublabel}</OptionAccount>
		</>
	);
	return <components.Option {...props} children={children} />;
};

export const RepositoryAssociatorServiceSearch = React.memo(
	(props: PropsWithChildren<RepositoryAssociatorServiceSearchProps>) => {
		const dispatch = useAppDispatch();
		const [selected, setSelected] = useState<SelectOptionType | null>(null);
		const [isLoading, setIsLoading] = useState(false);
		const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);
		const [openRepositories, setOpenRepositories] = React.useState<EnhancedRepoScm[] | undefined>(
			undefined
		);
		const [hasFetchedRepos, setHasFetchedRepos] = React.useState(false);
		const { width: entitySearchWidth, ref: entitySearchRef } = useResizeDetector();

		const derivedState = useSelector((state: CodeStreamState) => {
			return {
				repos: state.repos,
				// relatedRepos: props.relatedRepos || state.context.currentCodeErrorData?.relatedRepos,
			};
		});

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
						}
					}
					// //take repos in users IDE, and filter them with a list of
					// //related repos to service entity the error originates from
					let filteredResults: EnhancedRepoScm[];
					// if (!_isEmpty(derivedState.relatedRepos)) {
					// 	filteredResults = results.filter(_ => {
					// 		return derivedState.relatedRepos?.some(repo => {
					// 			const lowercaseRepoRemotes = repo.remotes.map(remote => remote.toLowerCase());
					// 			const lowercaseCurrentRemote = _.remote.toLowerCase();
					// 			return lowercaseRepoRemotes.includes(lowercaseCurrentRemote);
					// 		});
					// 	});
					// } else {
					// no related repo data for whatever reason, just show repos
					// instead of "repo not found" error
					filteredResults = results;
					// }
					setOpenRepositories(filteredResults);
					// if (props.isLoadingCallback) {
					// 	props.isLoadingCallback(false);
					// }
					setTimeout(() => {
						setHasFetchedRepos(true);
					}, 200);
				})
				.catch(e => {
					// if (props.isLoadingCallback) {
					// 	props.isLoadingCallback(false);
					// }
					logWarning(`could not get repos: ${e.message}`);
					setTimeout(() => {
						setHasFetchedRepos(true);
					}, 200);
				});
		};

		useDidMount(() => {
			// if (props.isLoadingCallback) {
			// 	props.isLoadingCallback(true);
			// }
			// if (!repositoryError) return;

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

		async function loadEntities(search: string, _loadedOptions, additional?: AdditionalType) {
			const { servicesToExcludeFromSearch } = props;

			const result = await HostApi.instance.send(GetObservabilityEntitiesRequestType, {
				searchCharacters: search,
				nextCursor: additional?.nextCursor,
			});

			let options = result.entities.map(e => {
				return {
					label: e.name,
					value: e.guid,
					sublabel: e.account,
					labelAppend: e.displayName,
				};
			});

			if (servicesToExcludeFromSearch && !_isEmpty(servicesToExcludeFromSearch)) {
				options = options.filter(
					option =>
						!servicesToExcludeFromSearch.some(exclude => {
							return exclude.entityGuid === option.value;
						})
				);
			}

			return {
				options,
				hasMore: !!result.nextCursor,
				additional: {
					nextCursor: result.nextCursor,
				},
			};
		}

		const handleClick = (e: React.MouseEvent<Element, MouseEvent>): void => {
			e.preventDefault();
			if (!selected) {
				return;
			}

			// If we have a remote and remoteName, assign repository
			if (props.remote && props.remoteName) {
				setIsLoading(true);
				setWarningOrErrors(undefined);

				const payload = {
					url: props.remote,
					name: props.remoteName,
					applicationEntityGuid: selected.value,
					entityId: selected.value,
					parseableAccountId: selected.value,
				};
				dispatch(api("assignRepository", payload))
					.then(response => {
						setTimeout(() => {
							if (response?.directives) {
								console.log("assignRepository", {
									directives: response?.directives,
								});
								// a little fragile, but we're trying to get the entity guid back
								if (props.onSuccess) {
									props.onSuccess({
										entityGuid: response?.directives.find(d => d.type === "assignRepository")?.data
											?.entityGuid,
									});
								}
							} else if (response?.error) {
								setWarningOrErrors([{ message: response.error }]);
							} else {
								setWarningOrErrors([
									{ message: "Failed to direct to entity dropdown, please refresh" },
								]);
								console.warn("Could not find directive", {
									_: response,
									payload: payload,
								});
							}
						}, 5000);
					})
					.catch(err => {
						setWarningOrErrors([
							{ message: "Failed to direct to entity dropdown, please refresh" },
						]);
						logError(`Unexpected error during assignRepository: ${err}`, {});
					})
					.finally(() => {
						setTimeout(() => {
							{
								/* @TODO clean up this code, put in place so spinner doesn't stop before onSuccess */
							}
							setIsLoading(false);
						}, 6000);
					});
			}

			if (props.isServiceSearch) {
				if (props.onSuccess) {
					props.onSuccess({ entityGuid: selected.value });
				}
			}
		};
		return (
			<NoContent style={{ margin: "0px 20px -6px 32px" }}>
				<div style={{ margin: "2px 0px 8px 0px", color: "var(--text-color)" }}>
					Associate this service with a repository so that you'll automatically see it any time you
					have that repository open. If the repository doesn't appear in the list, open it in your
					IDE.
				</div>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<div style={{ width: "100%", marginRight: "10px" }}>
						<div ref={entitySearchRef} style={{ marginBottom: "10px" }}>
							<DropdownWithSearch
								id="input-entity-autocomplete"
								name="entity-autocomplete"
								loadOptions={loadEntities}
								selectedOption={selected || undefined}
								handleChangeCallback={setSelected}
								customOption={Option}
								customWidth={entitySearchWidth?.toString()}
								valuePlaceholder={`Select an repository...`}
							/>
						</div>
					</div>
					<div style={{ width: "80px" }}>
						<Button
							style={{ width: "100%", height: "27px" }}
							isLoading={isLoading}
							disabled={isLoading || !selected}
							onClick={handleClick}
						>
							Associate
						</Button>
					</div>
				</div>
			</NoContent>
		);
	}
);
