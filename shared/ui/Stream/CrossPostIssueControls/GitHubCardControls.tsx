import React from "react";
import AsyncSelect from "react-select/async";
import Icon from "../Icon";
import Menu from "../Menu";
import {
	ThirdPartyProviderConfig,
	FetchThirdPartyBoardsRequestType,
	GitHubBoard,
	FetchAssignableUsersRequestType
} from "@codestream/protocols/agent";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { getIntegrationData } from "@codestream/webview/store/activeIntegrations/reducer";
import { GitHubIntegrationData } from "@codestream/webview/store/activeIntegrations/types";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { CrossPostIssueContext } from "../CodemarkForm";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { setIssueProvider } from "@codestream/webview/store/context/actions";
import { emptyArray, mapFilter } from "@codestream/webview/utils";
import ReactDOM from "react-dom";

export function GitHubCardControls(
	props: React.PropsWithChildren<{ provider: ThirdPartyProviderConfig }>
) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<GitHubIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<GitHubIntegrationData>) => {
			dispatch(updateForProvider<GitHubIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const selectRepoForCodeBlock = (repos: GitHubBoard[] = emptyArray) => {
		const { codeBlock } = crossPostIssueContext;
		let repoToSelect = repos[0];
		for (const repo of repos) {
			if (repo.path === (codeBlock && codeBlock.scm && codeBlock.scm.repoPath)) {
				repoToSelect = repo;
			}
		}

		if (repoToSelect) {
			updateDataState({ currentRepo: repoToSelect });
			crossPostIssueContext.setValues({ boardName: repoToSelect.name });
		}
	};

	useDidMount(() => {
		if (data.repos && data.repos.length > 0) {
			selectRepoForCodeBlock(data.repos);
		}
		if (!data.isLoading) {
			updateDataState({
				isLoading: true
			});
		}

		let isValid = true;

		const fetchBoards = async () => {
			let response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id
			});

			if (!isValid) return;

			selectRepoForCodeBlock(response.boards as GitHubBoard[]);
			updateDataState({
				isLoading: false,
				repos: response.boards as GitHubBoard[]
			});
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	});

	const [repoMenuState, setRepoMenuState] = React.useState<{ open: boolean; target?: EventTarget }>(
		{ open: false }
	);
	const handleClickRepo = React.useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		event.persist();
		setRepoMenuState(state => ({ open: !state.open, target: event.target }));
	}, []);
	const selectRepo = React.useCallback((repo?: GitHubBoard) => {
		setRepoMenuState({ open: false, target: undefined });
		if (repo) {
			updateDataState({
				currentRepo: repo
			});
			crossPostIssueContext.setValues({ boardName: repo.name });
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentRepo) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentRepo.apiIdentifier
			});

			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentRepo]
	);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentRepo } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentRepo ? currentRepo.id : "no-board"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				isMulti
				getOptionValue={option => option.value.id}
				placeholder="Assignees (optional)"
				onChange={value => crossPostIssueContext.setSelectedAssignees(value)}
			/>,
			crossPostIssueContext.assigneesInputTarget
		);
	})();

	if (data.isLoading)
		return (
			<div className="loading-boards">
				{assigneesInput}
				<span>
					<Icon className="spin" name="sync" />
					Fetching repositories...
				</span>
				<a
					style={{ marginLeft: "5px" }}
					onClick={e => {
						e.preventDefault();
						dispatch(setIssueProvider(undefined));
						updateDataState({ isLoading: false });
					}}
				>
					cancel
				</a>
			</div>
		);

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={_ => dispatch(setIssueProvider(undefined))} />
				{" Add an issue on "}
				<span className="channel-label" onClick={handleClickRepo}>
					{data.currentRepo && data.currentRepo.name}
					<Icon name="chevron-down" />
					{repoMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={repoMenuState.target}
							items={(data.repos || emptyArray).map(board => ({
								label: board.name,
								key: board.id,
								action: board
							}))}
							action={selectRepo}
						/>
					)}
				</span>
				{` on `}
				{props.children}
			</div>
		</>
	);
}
