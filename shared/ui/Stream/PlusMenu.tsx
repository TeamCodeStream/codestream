import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDidMount } from "../utilities/hooks";
import { CodeStreamState } from "../store";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import Icon from "./Icon";
import { openPanel } from "./actions";
import Menu from "./Menu";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { canCreateCodemark } from "../store/codemarks/actions";
import { HostApi } from "../webview-api";
import { StartWorkNotificationType } from "@codestream/protocols/webview";
import {
	setCurrentReview,
	clearCurrentPullRequest,
	setCreatePullRequest
} from "../store/context/actions";
import { ComposeKeybindings } from "./ComposeTitles";
import { getPRLabel } from "../store/providers/reducer";

interface PlusMenuProps {
	menuTarget: any;
	closeMenu: any;
}

export function PlusMenu(props: PlusMenuProps) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			kickstartEnabled: isFeatureEnabled(state, "kickstart"),
			activePanel: state.context.panelStack[0],
			textEditorUri: state.editorContext && state.editorContext.textEditorUri,
			lightningCodeReviewsEnabled: isFeatureEnabled(state, "lightningCodeReviews"),
			prLabel: getPRLabel(state)
		};
	});

	useDidMount(() => {
		const disposable = HostApi.instance.on(StartWorkNotificationType, () =>
			handleStartWorkRequest()
		);
		return () => disposable && disposable.dispose();
	});

	const handleStartWorkRequest = () => {
		dispatch(clearCurrentPullRequest());
		dispatch(setCurrentReview());
		if (derivedState.activePanel === WebviewPanels.Sidebar) {
			const div = document.getElementById("start-work-div");
			if (div) {
				div.classList.add("show-instructions");
				div.classList.add("highlight-pulse");
				div.scrollIntoView({ behavior: "smooth" });
				setTimeout(() => {
					div.classList.remove("highlight-pulse");
				}, 1000);
			}
		}
		dispatch(openPanel(WebviewPanels.Sidebar));
	};

	const go = panel => {
		dispatch(setCreatePullRequest());
		dispatch(clearCurrentPullRequest());
		dispatch(setCurrentReview());
		dispatch(openPanel(panel));
	};

	const menuItems = [] as any;
	if (derivedState.kickstartEnabled) {
		menuItems.push(
			{
				icon: <Icon name="ticket" />,
				label: "Start Work",
				action: handleStartWorkRequest,
				shortcut: ComposeKeybindings.work,
				subtextWide: "Grab a ticket & create a branch",

				key: "work"
			},
			{ label: "-" }
		);
	}

	if (canCreateCodemark(derivedState.textEditorUri)) {
		menuItems.push(
			{
				icon: <Icon name="comment" />,
				label: "Add Comment",
				action: () => go(WebviewPanels.NewComment),
				subtextWide: "Comment on code & share to slack",
				shortcut: ComposeKeybindings.comment,
				key: "comment"
			},
			{ label: "-" },
			{
				icon: <Icon name="issue" />,
				label: "Create Issue",
				subtextWide: "Perform ad-hoc code review",
				action: () => go(WebviewPanels.NewIssue),
				shortcut: ComposeKeybindings.issue,
				key: "issue"
			}
		);
	}

	if (derivedState.lightningCodeReviewsEnabled) {
		if (menuItems.length > 0) menuItems.push({ label: "-" });
		menuItems.push({
			icon: <Icon name="review" />,
			label: "Request a Code Review",
			subtextWide: "Get quick feedback on your WIP",
			action: () => go(WebviewPanels.NewReview),
			shortcut: ComposeKeybindings.review,
			key: "review"
		});
	}

	if (menuItems.length > 0) menuItems.push({ label: "-" });
	menuItems.push({
		icon: <Icon name="pull-request" />,
		label: `New ${derivedState.prLabel.PullRequest}`,
		subtextWide: `Open a ${derivedState.prLabel.PullRequest}`,
		action: () => go(WebviewPanels.NewPullRequest),
		shortcut: ComposeKeybindings.pr,
		key: "pr"
	});

	return (
		<Menu
			items={menuItems}
			target={props.menuTarget}
			action={props.closeMenu}
			align="dropdownRight"
		/>
	);
}
