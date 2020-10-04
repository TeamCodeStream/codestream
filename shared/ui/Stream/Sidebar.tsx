import React, { useState, useEffect, useMemo } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
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
import Codemarks from "./Codemarks";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { Pane, PaneState } from "../src/components/Pane";
import Draggable from "react-draggable";
import { findLastIndex } from "../utils";
import { setUserPreference } from "./actions";
import cx from "classnames";
import { getConnectedSupportedPullRequestHosts } from "../store/providers/reducer";
import { getPreferences } from "../store/users/reducer";
import { getRepos } from "../store/repos/reducer";

const Root = styled.div`
	height: 100%;
	background: var(--sidebar-background);
	color: var(--sidebar-foreground);
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

export const DragHeaderContext = React.createContext({
	drag: (e: any, id: WebviewPanels) => {},
	stop: (e: any, id: WebviewPanels) => {}
});

export const AVAILABLE_PANES = [
	WebviewPanels.OpenPullRequests,
	WebviewPanels.OpenReviews,
	WebviewPanels.CodemarksForFile,
	WebviewPanels.WorkInProgress,
	WebviewPanels.Tasks,
	WebviewPanels.Team
];

export const COLLAPSED_SIZE = 22;

const EMPTY_ARRAY = [];
const EMPTY_HASH = {};
const EMPTY_SIZE = { width: 0, height: 0 };
export const Sidebar = React.memo(function Sidebar() {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const preferences = getPreferences(state);
		const repos = getRepos(state);
		return {
			repos,
			removedPanes: preferences.removedPanes || EMPTY_HASH,
			sidebarPanes: preferences.sidebarPanes || EMPTY_HASH,
			sidebarPaneOrder: preferences.sidebarPaneOrder || AVAILABLE_PANES,
			currentUserId: state.session.userId!,
			hasPRProvider: getConnectedSupportedPullRequestHosts(state).length > 0
		};
	}, shallowEqual);
	const { sidebarPanes } = derivedState;
	const [openRepos, setOpenRepos] = useState<ReposScm[]>(EMPTY_ARRAY);
	const [dragCombinedHeight, setDragCombinedHeight] = useState<number | undefined>(undefined);
	const [sizes, setSizes] = useState(EMPTY_HASH);
	const [firstIndex, setFirstIndex] = useState<number | undefined>(undefined);
	const [secondIndex, setSecondIndex] = useState<number | undefined>(undefined);
	const [dragging, setDragging] = useState(false);
	const [windowSize, setWindowSize] = useState(EMPTY_SIZE);
	const [headerDragY, setHeaderDragY] = useState(0);

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

	// https://usehooks.com/useWindowSize/
	useEffect(() => {
		// Handler to call on window resize
		function handleResize() {
			// Set window width/height to state
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight
			});
		}

		// Add event listener
		window.addEventListener("resize", handleResize);

		// Call handler right away so state gets updated with initial window size
		handleResize();

		// Remove event listener on cleanup
		return () => window.removeEventListener("resize", handleResize);
	}, []); // Empty array ensures that effect is only run on mount

	const showPullRequests = useMemo(() => {
		if (derivedState.hasPRProvider) return true;
		// FIXME hardcoded github
		return openRepos.filter(r => r.providerGuess === "github").length > 0;
	}, [derivedState.hasPRProvider, openRepos]);

	const panes: {
		id: WebviewPanels;
		removed: boolean;
		collapsed: boolean;
		maximized: boolean;
		size: number;
	}[] = derivedState.sidebarPaneOrder
		.filter(id => showPullRequests || id !== WebviewPanels.OpenPullRequests)
		.map(id => {
			const settings = sidebarPanes[id] || {};
			return {
				id,
				removed: settings.removed,
				collapsed: settings.collapsed,
				maximized: settings.maximized,
				size: sizes[id] || Math.abs(settings.size) || 1
			};
		});
	// }, [sidebarPanes, sizes, derivedState.sidebarPaneOrder, showPullRequests]);

	const maximizedPane = panes.find(p => p.maximized && !p.removed);
	const collapsed = pane => {
		if (maximizedPane) return pane.id !== maximizedPane.id;
		else return pane.collapsed && !pane.removed;
	};

	const state = pane => {
		if (pane.removed) return PaneState.Removed;
		else if (maximizedPane) return PaneState.Minimized;
		else if (pane.collapsed) return PaneState.Collapsed;
		else return PaneState.Open;
	};

	const numCollapsed = panes.filter(p => collapsed(p)).length;

	const reducer = (accumulator, currentValue) => accumulator + currentValue;

	const totalSize = (() => {
		const expanded = panes.filter(p => !p.removed && !collapsed(p));
		if (expanded.length == 0) return 1;
		else return expanded.map(p => sizes[p.id] || p.size || 1).reduce(reducer);
	})();

	const positions = (() => {
		const availableHeight = windowSize.height - 40 - COLLAPSED_SIZE * numCollapsed;
		let accumulator = 40;
		return panes.map(p => {
			const size = sizes[p.id] || p.size || 1;
			const height = p.removed
				? 0
				: collapsed(p)
				? COLLAPSED_SIZE
				: (size * availableHeight) / totalSize;
			const position = {
				id: p.id,
				height,
				top: accumulator,
				size: p.size
			};
			accumulator += height;
			return position;
		});
	})();

	const dragPositions = (() => {
		// if a pane is maximized, you can't drag anything around
		if (maximizedPane) return [];

		// don't worry about using the dynamic version of collapsed because
		// if one pane is maximized, you can't drag. subtract 40 for the header padding,
		// and COLLAPSED_SIZE for each collapsed pane
		const availableHeight = windowSize.height - 40 - COLLAPSED_SIZE * numCollapsed;
		let accumulator = 40;
		const firstExpanded = panes.findIndex(p => !p.collapsed);
		const lastExpanded = findLastIndex(panes, p => !p.collapsed);
		return panes.map((p, index) => {
			const size = sizes[p.id] || p.size || 1;
			const height = p.removed
				? 0
				: p.collapsed
				? COLLAPSED_SIZE
				: (size * availableHeight) / totalSize;
			const position = index > firstExpanded && index <= lastExpanded ? { top: accumulator } : null;
			accumulator += height;
			return position;
		});
	})();

	const handleStart = (e: any, index: number) => {
		let findFirstIndex = index - 1;
		while (panes[findFirstIndex].collapsed) {
			findFirstIndex--;
		}
		let findSecondIndex = index;
		while (panes[findSecondIndex].collapsed) {
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
		dispatch(setUserPreference(["sidebarPanes", firstId, "size"], sizes[firstId]));
		const secondId = positions[secondIndex].id;
		dispatch(setUserPreference(["sidebarPanes", secondId, "size"], sizes[secondId]));
	};

	const handleDragHeader = (e: any, id: WebviewPanels) => {
		setHeaderDragY(e.clientY);
	};

	const handleStopHeader = (e: any, id: WebviewPanels) => {
		if (!id) return;

		let paneOrder = panes.map(pane => (pane.id === id ? "TO_DELETE" : pane.id));
		let newLocation = -1;
		panes.forEach((pane, index) => {
			if (pane.removed) return;
			const position = positions[index];
			// if the drag stop position is in the top half of div, the new location is
			// this one (which pushes it down)
			if (headerDragY > position.top && headerDragY < position.top + position.height / 2) {
				newLocation = index;
			} else if (
				headerDragY > position.top + position.height / 2 &&
				headerDragY < position.top + position.height
			) {
				// if the drag stop position is in the bottom half of the div, the new
				// location is this one plus one
				newLocation = index + 1;
			}
		});
		setHeaderDragY(0);

		if (newLocation > -1) {
			// add it to the new one
			paneOrder.splice(newLocation, 0, id);
			paneOrder = paneOrder.filter(p => p !== "TO_DELETE");
			// stop the animation for this re-ordering...
			setDragging(true);
			dispatch(setUserPreference(["sidebarPaneOrder"], paneOrder));
			// .. then re-enable it
			setTimeout(() => setDragging(false), 100);
		}
	};

	const renderPane = (pane, paneState) => {
		switch (pane.id) {
			case WebviewPanels.OpenPullRequests:
				return <OpenPullRequests openRepos={openRepos} paneState={paneState} />;
			case WebviewPanels.OpenReviews:
				return <OpenReviews openRepos={openRepos} paneState={paneState} />;
			case WebviewPanels.WorkInProgress:
				return <WorkInProgress openRepos={openRepos} paneState={paneState} />;
			case WebviewPanels.Tasks:
				return <IssueDropdown paneState={paneState} />;
			case WebviewPanels.CodemarksForFile:
				return <Codemarks paneState={paneState} />;
			case WebviewPanels.Team:
				return <TeamPanel paneState={paneState} />;
		}
		return null;
	};

	console.warn("Rendering sidebar: ", dragging);
	return (
		<Root className={dragging ? "" : "animate-height"}>
			<CreateCodemarkIcons />
			<ExtensionTitle>CodeStream</ExtensionTitle>
			<Panels>
				{panes.map((pane, index) => {
					const position = dragPositions[index];
					if (!position || pane.removed) return null;
					return (
						<Draggable
							key={index}
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
				<DragHeaderContext.Provider
					value={{
						drag: handleDragHeader,
						stop: handleStopHeader
					}}
				>
					{panes.map((pane, index) => {
						if (pane.removed) return null;
						const position = positions[index];
						const paneState = state(pane);
						const highlightTop =
							headerDragY > position.top && headerDragY < position.top + position.height / 2;
						const highlightBottom =
							headerDragY > position.top + position.height / 2 &&
							headerDragY < position.top + position.height;
						return (
							<Pane
								key={index}
								className={cx({
									highlightTop,
									highlightBottom,
									open: paneState === PaneState.Open
								})}
								top={position.top}
								height={position.height}
								tabIndex={index + 1}
							>
								{renderPane(pane, paneState)}
							</Pane>
						);
					})}
				</DragHeaderContext.Provider>
			</Panels>
		</Root>
	);
});
