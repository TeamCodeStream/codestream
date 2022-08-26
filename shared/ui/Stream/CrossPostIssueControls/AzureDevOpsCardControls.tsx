import React from "react";
import ReactDOM from "react-dom";
import AsyncSelect from "react-select/async";
import Icon from "../Icon";
import Menu from "../Menu";
import {
	CodeDelimiterStyles,
	ThirdPartyProviderConfig,
	FetchThirdPartyBoardsRequestType,
	AzureDevOpsBoard,
	FetchAssignableUsersRequestType
} from "@codestream/protocols/agent";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { getIntegrationData } from "@codestream/webview/store/activeIntegrations/reducer";
import { AzureDevOpsIntegrationData } from "@codestream/webview/store/activeIntegrations/types";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { CrossPostIssueContext } from "../CodemarkForm";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { mapFilter, emptyArray } from "@codestream/webview/utils";
import { setIssueProvider } from "@codestream/webview/store/context/actions";

export function AzureDevOpsCardControls(
	props: React.PropsWithChildren<{ provider: ThirdPartyProviderConfig }>
) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<AzureDevOpsIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<AzureDevOpsIntegrationData>) => {
			dispatch(updateForProvider<AzureDevOpsIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	useDidMount(() => {
		crossPostIssueContext.setValues({
			codeDelimiterStyle: CodeDelimiterStyles.HTML_MARKUP
		});

		if (data.projects && data.projects.length > 0 && data.currentProject) {
			crossPostIssueContext.setValues({
				board: data.currentProject || data.projects[0]
			});
			return;
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

			// make sure to persist current selections if possible
			const newCurrentProject = (data.currentProject
				? response.boards.find(b => b.id === data.currentProject!.id)
				: response.boards[0]) as AzureDevOpsBoard;

			updateDataState({
				isLoading: false,
				projects: response.boards as AzureDevOpsBoard[],
				currentProject: newCurrentProject
			});

			crossPostIssueContext.setValues({
				board: newCurrentProject
			});
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	});

	const [projectMenuState, setProjectMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickProject = React.useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		event.persist();
		setProjectMenuState(state => ({ open: !state.open, target: event.target }));
	}, []);

	const selectProject = React.useCallback((project?: AzureDevOpsBoard) => {
		setProjectMenuState({ open: false, target: undefined });
		if (project) {
			updateDataState({ currentProject: project });
			crossPostIssueContext.setValues({
				board: project
			});
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentProject) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentProject.id
			});
			return mapFilter(users, user => {
				if (user.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: user.displayName, value: user };
				return;
			});
		},
		[data.currentProject]
	);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentProject } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentProject ? currentProject.id : "no-project"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				isClearable
				placeholder={`Assignee (optional)`}
				onChange={value => crossPostIssueContext.setSelectedAssignees(value)}
			/>,
			crossPostIssueContext.assigneesInputTarget
		);
	})();

	if (data.isLoading) {
		return (
			<div className="loading-boards">
				{assigneesInput}
				<span>
					<Icon className="spin" name="sync" />
					Syncing projects...
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
	}

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={_ => dispatch(setIssueProvider(undefined))} />
				{" Add an issue in "}
				<span className="channel-label" onClick={handleClickProject}>
					{data.currentProject && data.currentProject.name}
					<Icon name="chevron-down" />
					{projectMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={projectMenuState.target}
							items={(data.projects || emptyArray).map(project => ({
								key: project.id,
								label: project.name,
								action: project
							}))}
							action={selectProject}
						/>
					)}
				</span>
				{` on `}
				{props.children}
			</div>
		</>
	);
}
