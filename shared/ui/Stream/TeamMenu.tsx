import React from "react";
import { logout } from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { WebviewModals } from "../ipc/webview.protocol.common";
import Icon from "./Icon";
import { openModal, openPanel } from "./actions";
import Menu from "./Menu";
import { setCurrentReview } from "../store/context/actions";
import { CodeStreamState } from "../store";
import { keyFilter } from "../utils";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { multiStageConfirmPopup } from "./MultiStageConfirm";
import { DeleteCompanyRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { WebviewPanels } from "@codestream/protocols/api";

interface TeamMenuProps {
	menuTarget: any;
	closeMenu: any;
}

const EMPTY_HASH = {};

export function TeamMenu(props: TeamMenuProps) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const team = state.teams[state.context.currentTeamId];
		const user = state.users[state.session.userId!];
		const adminIds = team.adminIds || [];
		const isCurrentUserAdmin = adminIds.includes(state.session.userId!);
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const mappedBlame = keyFilter(blameMap || EMPTY_HASH);
		const currentCompanyId = team.companyId;
		const company = state.companies[currentCompanyId];
		return {
			currentUserEmail: user.email,
			isCurrentUserAdmin,
			mappedBlame,
			team,
			currentCompanyId,
			company,
			autoJoinSupported: isFeatureEnabled(state, "autoJoin"),
		};
	});

	const deleteOrganization = () => {
		const { currentCompanyId } = derivedState;

		multiStageConfirmPopup({
			centered: true,
			stages: [
				{
					title: "Confirm Deletion",
					message:
						"Note that this only deletes the CodeStream organization and does NOT delete the corresponding New Relic organization.",
					buttons: [
						{ label: "Cancel", className: "control-button" },
						{
							label: "Delete Organization",
							className: "delete",
							advance: true,
						},
					],
				},
				{
					title: "Are you sure?",
					message:
						"Your CodeStream organization will be permanently deleted. This cannot be undone.",
					buttons: [
						{ label: "Cancel", className: "control-button" },
						{
							label: "Delete Organization",
							className: "delete",
							wait: true,
							action: async () => {
								await HostApi.instance.send(DeleteCompanyRequestType, {
									companyId: currentCompanyId,
								});
								dispatch(logout());
							},
						},
					],
				},
			],
		});
	};

	const go = modal => {
		dispatch(setCurrentReview());
		dispatch(openModal(modal));
	};

	const goPanel = panel => {
		dispatch(setCurrentReview());
		dispatch(openPanel(panel));
	};

	const menuItems = [] as any;
	menuItems.push({
		icon: <Icon name="add-user" />,
		label: "Invite Teammates",
		subtextWide: "Share CodeStream with your team",
		action: () => go(WebviewModals.Invite),
		key: "invite",
	});

	if (derivedState.isCurrentUserAdmin) {
		menuItems.push(
			{ label: "-" },
			{
				icon: <Icon name="pencil" />,
				label: "Change Organization Name",
				key: "change-team-name",
				action: () => go(WebviewModals.ChangeCompanyName),
			},
			{ label: "-" },
			{
				icon: <Icon name="gear" />,
				label: "Onboarding Settings...",
				key: "onboarding-settings",
				action: () => go(WebviewModals.TeamSetup),
				disabled: !derivedState.autoJoinSupported,
			},
			{ label: "-" },
			{
				icon: <Icon name="download" />,
				label: "Export Data",
				key: "export",
				action: () => goPanel(WebviewPanels.Export),
			},
			{ label: "-" },
			{
				icon: <Icon name="no-entry" />,
				label: "Delete Organization",
				key: "delete",
				action: () => deleteOrganization(),
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
