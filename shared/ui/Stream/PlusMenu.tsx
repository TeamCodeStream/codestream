import React from "react";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { CodeStreamState } from "../store";
import { WebviewPanels } from "@codestream/protocols/api";
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
	setCreatePullRequest,
} from "../store/context/actions";
import { ComposeKeybindings } from "./ComposeTitles";
import { getPRLabel } from "../store/providers/reducer";

interface PlusMenuProps {
	menuTarget: any;
	closeMenu: any;
}

export function PlusMenu(props: PlusMenuProps) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			kickstartEnabled: isFeatureEnabled(state, "kickstart"),
			isPDIdev: isFeatureEnabled(state, "PDIdev"),
			activePanel: state.context.panelStack[0],
			textEditorUri: state.editorContext && state.editorContext.textEditorUri,
			lightningCodeReviewsEnabled: isFeatureEnabled(state, "lightningCodeReviews"),
			prLabel: getPRLabel(state),
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
	if (false && derivedState.kickstartEnabled) {
		menuItems.push(
			{
				icon: <Icon name="ticket" />,
				label: "Start Work",
				action: handleStartWorkRequest,
				shortcut: ComposeKeybindings.work,
				subtextWide: "Grab a ticket & create a branch",

				key: "work",
			},
			{ label: "-" }
		);
	}

	if (canCreateCodemark(derivedState.textEditorUri) && !derivedState.isPDIdev) {
		menuItems.push(
			{
				icon: <Icon name="comment" />,
				label: "Add Comment",
				action: () => go(WebviewPanels.NewComment),
				subtextWide: "Comment on code & share to slack",
				shortcut: ComposeKeybindings.comment,
				key: "comment",
			},
			{ label: "-" },
			{
				icon: <Icon name="issue" />,
				label: "Create Issue",
				subtextWide: "Perform ad-hoc code review",
				action: () => go(WebviewPanels.NewIssue),
				shortcut: ComposeKeybindings.issue,
				key: "issue",
			}
		);
	}

	return (
		<Menu
			items={menuItems}
			target={props.menuTarget}
			action={props.closeMenu}
			align="bottomRight"
		/>
	);
}
