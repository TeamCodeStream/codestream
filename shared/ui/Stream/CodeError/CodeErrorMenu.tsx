import React, { useMemo, useRef, useState } from "react";
import { currentUserIsAdminSelector } from "@codestream/webview/store/users/reducer";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { DropdownButton, DropdownButtonItems } from "../DropdownButton";
import Icon from "../Icon";
import Menu from "../Menu";
import copy from "copy-to-clipboard";
import { CodeErrorMenuProps } from "./CodeError.Types";
import { confirmPopup } from "../Confirm";
import { HostApi } from "@codestream/webview/webview-api";
import { CloseCollaborationThreadRequestType } from "@codestream/protocols/agent";
import { resetDiscussions } from "@codestream/webview/store/discussions/discussionsSlice";
import { closeAllPanels } from "@codestream/webview/store/context/thunks";
import { closeAllModals } from "@codestream/webview/store/context/actions";

export const CodeErrorMenu = (props: CodeErrorMenuProps) => {
	const dispatch = useAppDispatch();
	const isAdmin = useAppSelector(currentUserIsAdminSelector);
	const discussion = useAppSelector(state => state.discussions.activeDiscussion);

	const [menuState, setMenuState] = useState<{ open: boolean; target?: any }>({
		open: false,
		target: undefined,
	});

	const permalinkRef = useRef<HTMLTextAreaElement>(null);

	const closeDiscussion = (threadId?: string) => {
		if (!threadId) return;

		HostApi.instance
			.send(CloseCollaborationThreadRequestType, {
				threadId,
			})
			.then(response => {
				if (response.nrError) {
					console.error(response.nrError);
					return;
				}

				if (response.success) {
					dispatch(resetDiscussions());
					dispatch(closeAllPanels());
					dispatch(closeAllModals());
				}
			})
			.catch(error => {
				console.error(error);
			});
	};

	const menuItems = useMemo(() => {
		const items: DropdownButtonItems[] = [];

		if (props.codeError?.permalink) {
			items.push({
				label: "Copy Link",
				icon: <Icon name="copy" />,
				key: "copy-permalink",
				action: () => {
					copy(props.codeError.permalink!);
				},
			});
		}

		if (discussion && isAdmin) {
			items.push({
				label: "Close Discussion",
				key: "close-discussion",
				action: () => {
					confirmPopup({
						title: "Are you sure?",
						message: "This will close the discussion. Are you sure?",
						centered: true,
						buttons: [
							{ label: "Go Back", className: "control-button" },
							{
								label: "Close Discussion",
								className: "delete",
								wait: true,
								action: () => {
									closeDiscussion(discussion?.threadId);
								},
							},
						],
					});
				},
			});
		}

		return items;
	}, [props.codeError, discussion?.threadId, isAdmin]);

	if (props.isCollapsed) {
		return (
			<DropdownButton size="compact" items={menuItems}>
				<textarea
					readOnly
					key="permalink-offscreen"
					ref={permalinkRef}
					value={props.codeError?.permalink}
					style={{ position: "absolute", left: "-9999px" }}
				/>
			</DropdownButton>
		);
	}

	return (
		<>
			{menuItems.length > 0 && (
				<DropdownButton
					items={menuItems}
					selectedKey={props.errorGroup?.state || "UNKNOWN"}
					variant="secondary"
					size="compact"
					noChevronDown
					wrap
				>
					<Icon name="kebab-horizontal" />
				</DropdownButton>
			)}
			<textarea
				readOnly
				key="permalink-offscreen"
				ref={permalinkRef}
				value={props.codeError?.permalink}
				style={{ position: "absolute", left: "-9999px" }}
			/>
			{menuItems.length > 0 && menuState.open && (
				<Menu
					target={menuState.target}
					action={() => setMenuState({ open: false })}
					items={menuItems}
					align="dropdownRight"
				/>
			)}
		</>
	);
};
