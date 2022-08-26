import React from "react";
import ReactDOM from "react-dom";
import AsyncSelect from "react-select/async";
import Icon from "../Icon";
import Menu from "../Menu";
import {
	CodeDelimiterStyles,
	ThirdPartyProviderConfig,
	FetchThirdPartyBoardsRequestType,
	AsanaBoard,
	AsanaList,
	FetchAssignableUsersRequestType
} from "@codestream/protocols/agent";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { getIntegrationData } from "@codestream/webview/store/activeIntegrations/reducer";
import { AsanaIntegrationData } from "@codestream/webview/store/activeIntegrations/types";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { CrossPostIssueContext } from "../CodemarkForm";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { mapFilter, emptyArray } from "@codestream/webview/utils";
import { setIssueProvider } from "@codestream/webview/store/context/actions";

export function AsanaCardControls(
	props: React.PropsWithChildren<{ provider: ThirdPartyProviderConfig }>
) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<AsanaIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<AsanaIntegrationData>) => {
			dispatch(updateForProvider<AsanaIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	useDidMount(() => {
		crossPostIssueContext.setValues({
			codeDelimiterStyle: CodeDelimiterStyles.HTML_LIGHT_MARKUP
		});

		if (data.boards && data.boards.length > 0 && data.currentBoard) {
			const boardId = (data.currentBoard || data.boards[0]).id;
			const listId = (data.currentList || data.boards[0].lists[0]).id;
			crossPostIssueContext.setValues({ boardId, listId });
			return;
		}

		if (!data.isLoading) {
			updateDataState({
				isLoading: true
			});
		}

		let isValid = true;

		const fetchBoards = async () => {
			const response = ((await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id
			})) as unknown) as { boards: AsanaBoard[] };

			if (!isValid) return;
			// make sure to persist current board/list selection if possible
			const newCurrentBoard = (data.currentBoard
				? response.boards.find(b => b.id === data.currentBoard!.id)
				: response.boards[0]) as AsanaBoard;

			const newCurrentList = (data.currentList
				? newCurrentBoard.lists.find(l => l.id === data.currentList!.id)
				: newCurrentBoard.lists[0]) as AsanaBoard;

			updateDataState({
				isLoading: false,
				boards: response.boards as AsanaBoard[],
				currentBoard: newCurrentBoard,
				currentList: newCurrentList
			});

			crossPostIssueContext.setValues({
				boardId: newCurrentBoard.id,
				listId: newCurrentList.id
			});
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	});

	const [boardMenuState, setBoardMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });
	const [listMenuState, setListMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickBoard = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setBoardMenuState(state => ({
			open: !state.open,
			target
		}));
	}, []);

	const selectBoard = React.useCallback((board?: AsanaBoard) => {
		setBoardMenuState({ open: false });
		if (board) {
			updateDataState({
				currentBoard: board,
				currentList: board.lists[0]
			});
			crossPostIssueContext.setValues({
				boardId: board.id,
				listId: board.lists[0].id
			});
		}
	}, []);

	const handleClickList = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setListMenuState(state => ({
			open: !state.open,
			target
		}));
	}, []);

	const selectList = React.useCallback((list?: AsanaList) => {
		setListMenuState({ open: false });

		if (list) {
			crossPostIssueContext.setValues({
				listId: list.id
			});
			updateDataState({
				currentList: list
			});
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentBoard) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: String(data.currentBoard.id)
			});
			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentBoard]
	);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentBoard } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentBoard ? currentBoard.id : "no-board"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				placeholder="Assignee (optional)"
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
					Fetching boards...
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

	const boardItems = (data.boards || emptyArray).map(board => ({
		label: board.name,
		key: board.id,
		action: board
	}));
	const listItems = data.currentBoard
		? data.currentBoard.lists.map(list => ({
				label: list.name,
				key: list.id,
				action: list
		  }))
		: [];

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={e => dispatch(setIssueProvider(undefined))} />
				{" Add a card on "}
				<span className="channel-label" onClick={handleClickBoard}>
					{data.currentBoard && data.currentBoard.name}
					<Icon name="chevron-down" />
					{boardMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={boardMenuState.target}
							items={boardItems}
							action={selectBoard}
						/>
					)}
				</span>
				{listItems.length > 0 && (
					<>
						{" in "}
						<span className="channel-label" onClick={handleClickList}>
							{data.currentList ? data.currentList.name : ""}
							<Icon name="chevron-down" />
							{listMenuState.open && (
								<Menu
									align="center"
									compact={true}
									target={listMenuState.target}
									items={listItems}
									action={selectList}
								/>
							)}
						</span>{" "}
					</>
				)}
				{` on `}
				{props.children}
			</div>
		</>
	);
}
