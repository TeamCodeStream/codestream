import React from "react";
import ReactDOM from "react-dom";
import AsyncSelect from "react-select/async";
import Icon from "../Icon";
import Menu from "../Menu";
import {
	ThirdPartyProviderConfig,
	FetchThirdPartyBoardsRequestType,
	ClubhouseProject,
	FetchAssignableUsersRequestType
} from "@codestream/protocols/agent";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { getIntegrationData } from "@codestream/webview/store/activeIntegrations/reducer";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { emptyArray, mapFilter, keyFilter } from "@codestream/webview/utils";
import { HostApi } from "@codestream/webview/webview-api";
import { ClubhouseIntegrationData } from "@codestream/webview/store/activeIntegrations/types";
import { setIssueProvider } from "@codestream/webview/store/context/actions";
import { CrossPostIssueContext } from "../CodemarkForm";
import { useDidMount } from "@codestream/webview/utilities/hooks";

interface Props {
	provider: ThirdPartyProviderConfig;
}

export function ClubhouseCardControls(props: React.PropsWithChildren<Props>) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<ClubhouseIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<ClubhouseIntegrationData>) => {
			dispatch(updateForProvider<ClubhouseIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	useDidMount(() => {
		if (data.projects && data.projects.length > 0 && data.currentProject) {
			const projectId = (data.currentProject || data.projects[0]).id;
			crossPostIssueContext.setValues({ projectId });
			return;
		}

		if (!data.isLoading) {
			updateDataState({
				isLoading: true
			});
		}

		let isValid = true;

		const fetchProjects = async () => {
			const response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id
			});

			if (!isValid) return;
			// make sure to persist current project selection if possible
			const newCurrentProject = (data.currentProject
				? response.boards.find(b => b.id === data.currentProject!.id)
				: response.boards[0]) as ClubhouseProject;


			updateDataState({
				isLoading: false,
				projects: response.boards as ClubhouseProject[],
				currentProject: newCurrentProject
			});

			crossPostIssueContext.setValues({
				projectId: newCurrentProject.id
			});
		};

		fetchProjects();

		return () => {
			isValid = false;
		};
	});

	const [projectMenuState, setProjectMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });
	const [listMenuState, setListMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickProject = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setProjectMenuState(state => ({
			open: !state.open,
			target
		}));
	}, []);

	const selectProject = React.useCallback((project?: ClubhouseProject) => {
		setProjectMenuState({ open: false });
		if (project) {
			crossPostIssueContext.setValues({
				projectId: project.id
			});
			updateDataState({
				currentProject: project
			});
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentProject) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentProject!.id
			});
			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentProject]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentProject } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentProject ? currentProject.id : "no-board"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				isMulti
				placeholder="Members (optional)"
				getOptionValue={option => option.value.id}
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
					Fetching projects...
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

	const projectItems = (data.projects || emptyArray).map(project => ({
		label: project.name,
		key: project.id,
		action: project
	}));

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={e => dispatch(setIssueProvider(undefined))} />
				{" Add a card on "}
				<span className="channel-label" onClick={handleClickProject}>
					{data.currentProject && data.currentProject.name}
					<Icon name="chevron-down" />
					{projectMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={projectMenuState.target}
							items={projectItems}
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
