import {
	EntityAccount,
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
import { DropdownWithSearch } from "./DropdownWithSearch";
import { useResizeDetector } from "react-resize-detector";
import { CodeStreamState } from "../store";
import { useDidMount } from "@codestream/webview/utilities/hooks";

interface RepositoryAssociatorServiceSearchProps {
	title?: string;
	label?: string | React.ReactNode;
	remote?: string;
	remoteName?: string;
	onSuccess?: (entityGuid: { entityGuid: string; repoId: string }) => void;
	servicesToExcludeFromSearch?: EntityAccount[];
	isSidebarView?: boolean;
	isServiceSearch?: boolean;
	entityGuid: string;
}

type SelectOptionType = { label: string; value: string; remote: string; name: string; id: string };

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

const Option = (props: OptionProps) => {
	const children = (
		<>
			<OptionName>{props.data?.label}</OptionName>
		</>
	);
	return <components.Option {...props} children={children} />;
};

export const RepositoryAssociatorServiceSearch = React.memo(
	(props: PropsWithChildren<RepositoryAssociatorServiceSearchProps>) => {
		const dispatch = useAppDispatch();
		const [selected, setSelected] = useState<SelectOptionType | null>(null);
		const [isLoading, setIsLoading] = useState(false);
		const { width: repoSearchWidth, ref: repoSearchRef } = useResizeDetector();

		const derivedState = useSelector((state: CodeStreamState) => {
			return {
				repos: state.repos,
			};
		});

		useDidMount(() => {
			const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
				if (e.type === ChangeDataType.Workspace) {
					fetchRepos();
				}
			});

			return () => {
				disposable && disposable.dispose();
			};
		});

		async function fetchRepos() {
			try {
				const response = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
					includeRemotes: true,
				});

				if (!response.repositories) {
					console.warn("No repositories found");
					return [];
				}

				const results: {
					key: string;
					remote: string;
					label: string;
					name: string;
					value: string;
				}[] = [];
				for (const repo of response.repositories) {
					if (repo.remotes) {
						for (const remote of repo.remotes) {
							const id = repo.id || "";
							const remoteUrl = remote.rawUrl;
							if (remoteUrl && id) {
								const name = derivedState.repos[id] ? derivedState.repos[id].name : "repo";
								const label = `${name} (${remoteUrl})`;
								results.push({
									...repo,
									key: btoa(remoteUrl),
									remote: remoteUrl,
									label: label,
									name: name,
									value: name,
								});
							}
						}
					}
				}

				return results;
			} catch (error) {
				console.error("Error fetching repositories:", error);
				return [];
			}
		}

		const handleClickAssociate = (e: React.MouseEvent<Element, MouseEvent>): void => {
			e.preventDefault();
			if (!selected) {
				return;
			}

			setIsLoading(true);

			const payload = {
				url: selected.remote,
				name: selected.name,
				applicationEntityGuid: props.entityGuid,
				entityId: props.entityGuid,
				parseableAccountId: props.entityGuid,
			};
			dispatch(api("assignRepository", payload))
				.then(response => {
					setTimeout(() => {
						if (response?.directives) {
							console.log("assignRepository", {
								directives: response?.directives,
							});
							if (props.onSuccess) {
								props.onSuccess({
									entityGuid: response?.directives.find(d => d.type === "assignRepository")?.data
										?.entityGuid,
									repoId: selected.id,
								});
							}
						} else {
							console.warn("Could not find directive", {
								_: response,
								payload: payload,
							});
						}
					}, 5000);
				})
				.catch(err => {
					logError(`Unexpected error during assignRepository: ${err}`, {});
				})
				.finally(() => {
					setTimeout(() => {
						setIsLoading(false);
					}, 6000);
				});
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
						<div ref={repoSearchRef} style={{ marginBottom: "10px" }}>
							<DropdownWithSearch
								id="input-repo-associator-service-search"
								name="input-repo-associator-service-search"
								loadOptions={async (search: string) => {
									try {
										const options = await fetchRepos();

										interface Option {
											name: string;
											// other properties if applicable
										}

										return {
											options: options.filter(_ =>
												search ? _?.name.toLowerCase().indexOf(search.toLowerCase()) > -1 : true
											),
											hasMore: false, // You may need to change this based on your pagination logic
										};
									} catch (error) {
										console.error("Error fetching options:", error);
										return {
											options: [],
											hasMore: false,
										};
									}
								}}
								selectedOption={selected || undefined}
								handleChangeCallback={setSelected}
								customOption={Option}
								customWidth={repoSearchWidth?.toString()}
								valuePlaceholder={`Select an repository...`}
							/>
						</div>
					</div>
					<div style={{ width: "80px" }}>
						<Button
							style={{ width: "100%", height: "27px" }}
							isLoading={isLoading}
							disabled={isLoading || !selected}
							onClick={handleClickAssociate}
						>
							Associate
						</Button>
					</div>
				</div>
			</NoContent>
		);
	}
);
