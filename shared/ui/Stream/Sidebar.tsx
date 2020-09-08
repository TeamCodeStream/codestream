import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { CSMe } from "@codestream/protocols/api";
import styled from "styled-components";
import { OpenReviews } from "./OpenReviews";
import { ReposScm, GetReposScmRequestType } from "../protocols/agent/agent.protocol.scm";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "..";
import { OpenPullRequests } from "./OpenPullRequests";
import { TeamPanel } from "./TeamPanel";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import IssueDropdown from "./CrossPostIssueControls/IssueDropdown";
import { WorkInProgress } from "./WorkInProgress";
import CodemarksForFile from "./CodemarksForFile";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { Pane } from "../src/components/Pane";
import Draggable, { DraggableEvent } from "react-draggable";
import { findLastIndex } from "../utils";
import { setUserPreference } from "./actions";

const EMPTY_ARRAY = [];

const Root = styled.div`
	height: 100%;
`;

const Panels = styled.div`
	padding-top: 40px;
	height: 100%;
`;

export const ExtensionTitle = styled.h2`
	font-size: 11px;
	font-weight: 400;
	text-transform: uppercase;
	padding: 5px 20px 0 20px;
	position: fixed;
`;

export const ResizeHandle = styled.div`
	position: absolute;
	top: -1px;
	height: 3px;
	width: 100%;
	// background: rgba(255, 0, 0, 0.1);
	cursor: row-resize;
	z-index: 500;
`;

const EMPTY_HASH = {};
export const Sidebar = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const currentUser = state.users[state.session.userId!] as CSMe;
		return {
			sidebarPanelPreferences: preferences.sidebarPanels || EMPTY_HASH,
			currentUserId: state.session.userId!
		};
	});
	const { sidebarPanelPreferences } = derivedState;
	const [openRepos, setOpenRepos] = useState<ReposScm[]>(EMPTY_ARRAY);
	const [dragCombinedHeight, setDragCombinedHeight] = useState<number | undefined>(undefined);
	const [sizes, setSizes] = useState({});
	const [firstIndex, setFirstIndex] = useState<number | undefined>(undefined);
	const [secondIndex, setSecondIndex] = useState<number | undefined>(undefined);
	const [dragging, setDragging] = useState(false);

	const fetchOpenRepos = async () => {
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true,
			includeProviders: true
		});
		if (response && response.repositories) {
			setOpenRepos(response.repositories);
		}
	};

	useDidMount(() => {
		fetchOpenRepos();
	});

	const panels: { id: WebviewPanels; collapsed: boolean; size: number }[] = React.useMemo(() => {
		return [
			WebviewPanels.OpenPullRequests,
			WebviewPanels.OpenReviews,
			WebviewPanels.WorkInProgress,
			WebviewPanels.Tasks,
			WebviewPanels.CodemarksForFile,
			WebviewPanels.Team
		].map(id => {
			const settings = sidebarPanelPreferences[id] || {};
			return {
				id,
				collapsed: settings.collapsed,
				size: sizes[id] || Math.abs(settings.size) || 1
			};
		});
	}, [sidebarPanelPreferences, sizes]);

	console.warn("PANELS ARE: ", panels);
	const numCollapsed = useMemo(() => panels.filter(p => p.collapsed).length, [
		sidebarPanelPreferences
	]);
	const reducer = (accumulator, currentValue) => accumulator + currentValue;

	const totalSize = useMemo(() => {
		const expanded = panels.filter(p => !p.collapsed);
		if (expanded.length == 0) return 1;
		else return expanded.map(p => sizes[p.id] || p.size || 1).reduce(reducer);
	}, [panels, sizes]);

	const positions = useMemo(() => {
		const availableHeight = window.innerHeight - 40 - 25 * numCollapsed;
		let accumulator = 40;
		return panels.map(p => {
			const size = sizes[p.id] || p.size || 1;
			const height = p.collapsed ? 25 : (size * availableHeight) / totalSize;
			const position = {
				id: p.id,
				height,
				top: accumulator,
				size: p.size
			};
			accumulator += height;
			return position;
		});
	}, [sidebarPanelPreferences, sizes]);

	const dragPositions = useMemo(() => {
		const availableHeight = window.innerHeight - 40 - 25 * numCollapsed;
		let accumulator = 40;
		const firstExpanded = panels.findIndex(p => !p.collapsed);
		const lastExpanded = findLastIndex(panels, p => !p.collapsed);
		return panels.map((p, index) => {
			const size = sizes[p.id] || p.size || 1;
			const height = p.collapsed ? 25 : (size * availableHeight) / totalSize;
			const position = index > firstExpanded && index <= lastExpanded ? { top: accumulator } : null;
			accumulator += height;
			return position;
		});
	}, [sidebarPanelPreferences, sizes]);

	const handleStart = (e: any, index: number) => {
		let findFirstIndex = index - 1;
		while (panels[findFirstIndex].collapsed) {
			findFirstIndex--;
		}
		let findSecondIndex = index;
		while (panels[findSecondIndex].collapsed) {
			findSecondIndex++;
		}
		if (findFirstIndex >= 0) {
			setDragCombinedHeight(positions[findFirstIndex].height + positions[findSecondIndex].height);
			setFirstIndex(findFirstIndex);
			setSecondIndex(findSecondIndex);
			setDragging(true);
		}
	};

	const handleDrag = (e: any, index: number) => {
		if (firstIndex === undefined || secondIndex === undefined) return;
		const firstPosition = positions[firstIndex];
		const secondPosition = positions[secondIndex];
		if (dragCombinedHeight) {
			let pct = (e.clientY - firstPosition.top) / dragCombinedHeight;
			if (pct < 0.2) pct = 0.2;
			if (pct > 0.8) pct = 0.8;
			const combinedSize = firstPosition.size + secondPosition.size;
			const firstSize = pct * combinedSize;
			const secondSize = (1 - pct) * combinedSize;
			const firstId = positions[firstIndex].id;
			const secondId = positions[secondIndex].id;
			const newSizes = { ...sizes, [firstId]: firstSize, [secondId]: secondSize };
			setSizes(newSizes);
		}
	};

	const handleStop = (e: any, index: number) => {
		setDragging(false);
		if (firstIndex === undefined || secondIndex === undefined) return;
		const firstId = positions[firstIndex].id;
		const firstSettings = { ...sidebarPanelPreferences[firstId], size: sizes[firstId] };
		dispatch(setUserPreference(["sidebarPanels", firstId], firstSettings));
		const secondId = positions[secondIndex].id;
		const secondSettings = { ...sidebarPanelPreferences[secondId], size: sizes[secondId] };
		dispatch(setUserPreference(["sidebarPanels", secondId], secondSettings));
	};

	return (
		<Root className={dragging ? "" : "animate-height"}>
			<CreateCodemarkIcons />
			<ExtensionTitle>CodeStream</ExtensionTitle>
			<Panels>
				{panels.map((panel, index) => {
					const position = dragPositions[index];
					if (!position) return null;
					return (
						<Draggable
							axis="y"
							position={{ x: 0, y: position.top }}
							scale={1}
							onStart={e => handleStart(e, index)}
							onDrag={e => handleDrag(e, index)}
							onStop={e => handleStop(e, index)}
						>
							<ResizeHandle />
						</Draggable>
					);
				})}
				{panels.map((panel, index) => {
					const position = positions[index];
					return (
						<Pane top={position.top} height={position.height} tabIndex={index + 1}>
							{(() => {
								switch (panel.id) {
									case WebviewPanels.OpenPullRequests:
										return <OpenPullRequests openRepos={openRepos} expanded={!panel.collapsed} />;
									case WebviewPanels.OpenReviews:
										return <OpenReviews openRepos={openRepos} expanded={!panel.collapsed} />;
									case WebviewPanels.WorkInProgress:
										return <WorkInProgress openRepos={openRepos} expanded={!panel.collapsed} />;
									case WebviewPanels.Tasks:
										return <IssueDropdown expanded={!panel.collapsed} />;
									case WebviewPanels.CodemarksForFile:
										return <CodemarksForFile expanded={!panel.collapsed} />;
									case WebviewPanels.Team:
										return <TeamPanel expanded={!panel.collapsed} />;
								}
								return null;
							})()}
						</Pane>
					);
				})}
			</Panels>
		</Root>
	);
};
