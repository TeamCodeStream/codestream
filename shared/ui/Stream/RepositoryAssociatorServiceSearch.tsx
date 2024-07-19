import {
	EntityAccount,
	GetReposScmRequestType,
	ReposScm,
	DidChangeDataNotificationType,
	ChangeDataType,
} from "@codestream/protocols/agent";
import React, { useEffect, useRef, PropsWithChildren, useState } from "react";
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

const OptionRemote = styled.div`
	color: var(--text-color-subtle);
	font-size: smaller;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	direction: rtl;
	text-align: left;
	max-width: 100%;
`;

const Option = (props: OptionProps) => {
	const children = (
		<div>
			<div title={props.data?.remote}>
				<OptionName>{props.data?.label}</OptionName>
				<OptionRemote>{props.data?.remote}</OptionRemote>
			</div>
		</div>
	);
	return <components.Option {...props} children={children} />;
};

export const formatRepoResponse = (response, repos) => {
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
					const name = repos[id]?.name || repo.name || "repo";
					results.push({
						...repo,
						key: btoa(remoteUrl),
						remote: remoteUrl,
						label: name,
						name: name,
						value: name,
					});
				}
			}
		}
	}

	return results;
};

export const RepositoryAssociatorServiceSearch = React.memo(
	(props: PropsWithChildren<RepositoryAssociatorServiceSearchProps>) => {
		const dispatch = useAppDispatch();
		const [selected, setSelected] = useState<SelectOptionType | null>(null);
		const [isLoading, setIsLoading] = useState(false);
		const elementRef = useRef(null);
		const [width, setWidth] = useState(0);

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

				const results = formatRepoResponse(response, derivedState.repos);

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

		useEffect(() => {
			const handleResize = () => {
				if (elementRef.current) {
					//@ts-ignore
					const elementWidth = elementRef.current?.offsetWidth;
					setWidth(elementWidth);
				}
			};
			handleResize();
			window.addEventListener("resize", handleResize);
			return () => {
				window.removeEventListener("resize", handleResize);
			};
		}, [elementRef]);

		return (
			<NoContent style={{ margin: "0px 20px -6px 32px" }}>
				<div style={{ margin: "2px 0px 8px 0px", color: "var(--text-color)" }}>
					Associate this service with a repository so that you'll automatically see it any time you
					have that repository open. If the repository doesn't appear in the list, open it in your
					IDE.
				</div>
				<div style={{ display: "flex" }}>
					<div
						style={{
							flexGrow: 1,
							flexShrink: 1,
							whiteSpace: "nowrap",
							overflow: "hidden",
							marginRight: "10px",
						}}
					>
						<div ref={elementRef} style={{ marginBottom: "10px" }}>
							<DropdownWithSearch
								id="input-repo-associator-service-search"
								name="input-repo-associator-service-search"
								loadOptions={async (search: string) => {
									try {
										const options = await fetchRepos();

										return {
											options: options.filter(_ =>
												search ? _?.name.toLowerCase().indexOf(search.toLowerCase()) > -1 : true
											),
											hasMore: false,
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
								customWidth={width?.toString()}
								valuePlaceholder={`Select a repository...`}
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
