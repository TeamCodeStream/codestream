import React from "react";
import { logout } from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { WebviewModals } from "../ipc/webview.protocol.common";
import Icon from "./Icon";
import { openModal, openPanel } from "./actions";
import Menu from "./Menu";
import {
	setCurrentReview,
	clearCurrentPullRequest,
	setCreatePullRequest,
} from "../store/context/actions";
import { CodeStreamState } from "../store";
import { keyFilter } from "../utils";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { multiStageConfirmPopup } from "./MultiStageConfirm";
import { DeleteCompanyRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";

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
		dispatch(setCreatePullRequest());
		dispatch(clearCurrentPullRequest());
		dispatch(setCurrentReview());
		dispatch(openModal(modal));
	};

	const goPanel = panel => {
		dispatch(setCreatePullRequest());
		dispatch(clearCurrentPullRequest());
		dispatch(setCurrentReview());
		dispatch(openPanel(panel));
	};

	const menuItems = [
		{
			icon: <Icon name="team" />,
			label: "My Organization",
			subtextWide: "View your teammates",
			action: () => go(WebviewModals.Team),
			key: "team",
		},
	] as any;
	if (derivedState.company.codestreamOnly) {
		menuItems.push(
			{ label: "-" },
			{
				icon: <Icon name="add-user" />,
				label: "Invite Teammates",
				subtextWide: "Share CodeStream with your team",
				action: () => go(WebviewModals.Invite),
				key: "invite",
			}
		);
	}
	menuItems.push(
		{ label: "-" },
		{
			icon: <Icon name="arrow-right" />,
			label: "Blame Map",
			subtextWide: "Reassign code responsibility",
			action: () => go(WebviewModals.BlameMap),
			key: "blame",
		}
	);

	return (
		<Menu
			items={menuItems}
			target={props.menuTarget}
			action={props.closeMenu}
			align="bottomRight"
		/>
	);
}
