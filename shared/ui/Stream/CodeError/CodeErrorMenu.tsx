import React, { useMemo, useRef, useState } from "react";
import { shallowEqual } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { currentUserIsAdminSelector } from "@codestream/webview/store/users/reducer";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { DropdownButton, DropdownButtonItems } from "../DropdownButton";
import Icon from "../Icon";
import Menu from "../Menu";
import copy from "copy-to-clipboard";
import { CodeErrorMenuProps } from "./CodeError.Types";

export const CodeErrorMenu = (props: CodeErrorMenuProps) => {
	const dispatch = useAppDispatch();
	const isAdmin = useAppSelector(currentUserIsAdminSelector);
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			entityGuid: state.context.currentEntityGuid!,
			currentUserId: state.session.userId!,
			currentUser: state.users[state.session.userId!],
		};
	}, shallowEqual);

	const [isLoading, setIsLoading] = useState(false);
	const [menuState, setMenuState] = useState<{ open: boolean; target?: any }>({
		open: false,
		target: undefined,
	});

	const permalinkRef = useRef<HTMLTextAreaElement>(null);

	const menuItems = useMemo(() => {
		const items: DropdownButtonItems[] = [];

		// if (props.errorGroup) {
		// 	items.push({
		// 		label: "Refresh",
		// 		icon: <Icon name="refresh" />,
		// 		key: "refresh",
		// 		action: async () => {
		// 			setIsLoading(true);
		// 			await dispatch(
		// 				fetchErrorGroup({ codeError: props.codeError, entityGuid: derivedState.entityGuid })
		// 			);
		// 			setIsLoading(false);
		// 		},
		// 	});
		// }

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

		// Our 'isAdmin' flag doesn't seem to match what NR1 is expecting, so it doesn't work
		// if (isAdmin) {
		// 	items.push({
		// 		label: "Delete All Comments",
		// 		icon: <Icon name="trash" />,
		// 		key: "deleteAll-permalink",
		// 		action: () => {
		// 			confirmPopup({
		// 				title: "Are you sure?",
		// 				message:
		// 					"This will delete all comments in this conversation. Deleting a comment cannot be undone.",
		// 				centered: true,
		// 				buttons: [
		// 					{ label: "Go Back", className: "control-button" },
		// 					{
		// 						label: "Delete Comments",
		// 						className: "delete",
		// 						wait: true,
		// 						action: async () => {
		// 							//await deleteThread();
		// 						},
		// 					},
		// 				],
		// 			});
		// 		},
		// 	});
		// }

		return items;
	}, []);

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
					isLoading={isLoading}
					variant="secondary"
					size="compact"
					noChevronDown
					wrap
				>
					<Icon loading={isLoading} name="kebab-horizontal" />
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
