import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { WebviewPanels, WebviewModals, WebviewPanelNames } from "../ipc/webview.protocol.common";
import Icon from "./Icon";
import { openPanel } from "./actions";
import Menu from "./Menu";
import { HostApi } from "../webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { sortBy as _sortBy } from "lodash-es";
import { logout, switchToTeam } from "../store/session/actions";
import { EMPTY_STATUS } from "./StartWork";
import { MarkdownText } from "./MarkdownText";
import { setProfileUser, openModal } from "../store/context/actions";
import { confirmPopup } from "./Confirm";
import { UpdateTeamSettingsRequestType } from "@codestream/protocols/agent";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { setUserPreference } from "./actions";
import { AVAILABLE_PANES } from "./Sidebar";

interface EllipsisMenuProps {
	menuTarget: any;
	closeMenu: any;
}

const EMPTY_HASH = {};

export function EllipsisMenu(props: EllipsisMenuProps) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		const user = state.users[state.session.userId!];
		const onPrem = state.configs.isOnPrem;

		return {
			sidebarPanePreferences: state.preferences.sidebarPanes || EMPTY_HASH,
			sidebarPaneOrder: state.preferences.sidebarPaneOrder || AVAILABLE_PANES,
			userTeams: _sortBy(Object.values(state.teams).filter(t => !t.deactivated), "name"),
			currentTeamId: teamId,
			serverUrl: state.configs.serverUrl,
			company: state.companies[team.companyId] || {},
			team,
			currentUserId: state.session.userId,
			currentUserStatus: (user.status && user.status[teamId]) || EMPTY_STATUS,
			currentUserEmail: user.email,
			pluginVersion: state.pluginVersion,
			xraySetting: team.settings ? team.settings.xray : "",
			multipleReviewersApprove: isFeatureEnabled(state, "multipleReviewersApprove"),
			autoJoinSupported: isFeatureEnabled(state, "autoJoin"),
			isOnPrem: onPrem
		};
	});

	const buildSwitchTeamMenuItem = () => {
		const { userTeams, currentTeamId } = derivedState;

		const buildSubmenu = () => {
			const items = userTeams.map(team => {
				const isCurrentTeam = team.id === currentTeamId;
				return {
					key: team.id,
					label: team.name,
					// icon: isCurrentTeam ? <Icon name="check" /> : undefined,
					checked: isCurrentTeam,
					noHover: isCurrentTeam,
					action: () => {
						if (!isCurrentTeam) dispatch(switchToTeam(team.id));
					}
				};
			}) as any;

			items.push(
				{ label: "-" },
				{
					key: "create-team",
					icon: <Icon name="plus" />,
					label: "Create New Team",
					action: () => {
						dispatch(openModal(WebviewModals.CreateTeam));
					}
				}
			);

			return items;
		};

		return {
			label: "Switch Team",
			submenu: buildSubmenu()
		};
	};

	const go = (panel: WebviewPanels) => dispatch(openPanel(panel));
	const popup = (modal: WebviewModals) => dispatch(openModal(modal));

	const openUrl = url => {
		HostApi.instance.send(OpenUrlRequestType, { url });
	};

	const changeXray = async value => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: derivedState.team.id,
			settings: { xray: value }
		});
	};

	const deleteTeam = () => {
		confirmPopup({
			title: "Delete Team",
			message:
				"Team deletion is handled by customer service. Please send an email to support@codestream.com.",
			centered: false,
			buttons: [{ label: "OK", className: "control-button" }]
		});
	};

	const buildAdminTeamMenuItem = () => {
		const { team, currentUserId, xraySetting } = derivedState;
		const { adminIds } = team;

		if (adminIds && adminIds.includes(currentUserId!)) {
			const submenu = [
				{
					label: "Change Team Name",
					key: "change-team-name",
					action: () => dispatch(openModal(WebviewModals.ChangeTeamName))
				},
				{ label: "-" },
				{
					label: "Onboarding Settings...",
					key: "onboarding-settings",
					action: () => dispatch(openModal(WebviewModals.TeamSetup)),
					disabled: !derivedState.autoJoinSupported
				},
				{
					label: "Feedback Request Settings...",
					key: "feedback-request-settings",
					action: () => dispatch(openModal(WebviewModals.ReviewSettings)),
					disabled: !derivedState.multipleReviewersApprove
				},
				{
					label: "Live View Settings",
					key: "live-view-settings",
					submenu: [
						{
							label: "Always On",
							checked: xraySetting === "on",
							action: () => changeXray("on")
						},
						{
							label: "Always Off",
							checked: xraySetting === "off",
							action: () => changeXray("off")
						},
						{
							label: "User Selectable",
							checked: !xraySetting || xraySetting === "user",
							action: () => changeXray("user")
						},
						{ label: "-", action: () => {} },
						{
							label: "What is Live View?",
							action: () => {
								HostApi.instance.send(OpenUrlRequestType, {
									url: "https://docs.codestream.com/userguide/features/myteam-section/"
								});
							}
						}
					]
				},
				{ label: "-" },
				{ label: "Export Data", action: () => go(WebviewPanels.Export) },
				{ label: "-" },
				{ label: "Delete Team", action: deleteTeam }
			];
			return {
				label: "Team Admin",
				key: "admin",
				submenu
			};
		} else return null;
	};

	const { currentUserStatus } = derivedState;

	const menuItems = [] as any;

	if (false && currentUserStatus.label) {
		menuItems.push({
			label: (
				<>
					{currentUserStatus.ticketProvider ? (
						<Icon name={currentUserStatus.ticketProvider} />
					) : (
						<Icon name="ticket" />
					)}
					<MarkdownText text={currentUserStatus.label} inline={true}></MarkdownText>
				</>
			),
			key: "status"
		});
	}

	menuItems.push(
		{
			label: "Account",
			action: "account",
			submenu: [
				{
					label: "View Profile",
					action: () => {
						dispatch(setProfileUser(derivedState.currentUserId));
						go(WebviewPanels.Profile);
					}
				},
				{ label: "Change Profile Photo", action: () => popup(WebviewModals.ChangeAvatar) },
				{ label: "Change Email", action: () => popup(WebviewModals.ChangeEmail) },
				{ label: "Change Username", action: () => popup(WebviewModals.ChangeUsername) },
				{ label: "Change Full Name", action: () => popup(WebviewModals.ChangeFullName) },
				{ label: "-" },
				{ label: "Sign Out", action: () => dispatch(logout()) }
			]
		},
		{
			label: "View",
			action: "view",
			submenu: derivedState.sidebarPaneOrder.map(id => {
				const settings = derivedState.sidebarPanePreferences[id] || EMPTY_HASH;
				return {
					key: id,
					label: WebviewPanelNames[id],
					checked: !settings.removed,
					action: () => {
						dispatch(setUserPreference(["sidebarPanes", id, "removed"], !settings.removed));
						if (!settings.removed) {
							HostApi.instance.track("Sidebar Adjusted", {
								Section: id,
								Adjustment: "Hidden"
							});
						}
					}
				};
			})
		},
		{
			label: "Notifications",
			action: () => dispatch(openModal(WebviewModals.Notifications))
		}
	);

	menuItems.push(
		...[
			{ label: "-" },
			{
				label: <h3>{derivedState.team.name}</h3>,
				key: "teamheader",
				noHover: true,
				disabled: true
			},
			// {
			// 	label: `Invite people to ${derivedState.team.name}`,
			// 	action: () => dispatch(openModal(WebviewModals.Invite))
			// },
			buildAdminTeamMenuItem(),
			buildSwitchTeamMenuItem(),
			{ label: "-" }
		].filter(Boolean)
	);

	// Feedback:
	// - Email support
	// - Tweet your feedback
	//
	// help:
	// - Documentation
	// - Video Library
	// - Report an Issue
	// - Keybindings
	// - FAQ
	menuItems.push(
		{ label: "Integrations", action: () => dispatch(openPanel(WebviewPanels.Integrations)) },
		{
			label: "Feedback",
			action: () => openUrl("https://github.com/TeamCodeStream/codestream/issues")
		},
		{
			label: "Help",
			key: "help",
			submenu: [
				{
					label: "Documentation",
					key: "documentation",
					action: () => openUrl("https://help.codestream.com")
				},
				{
					label: "Video Library",
					key: "videos",
					action: () => openUrl("https://www.codestream.com/video-library")
				},
				{
					label: "Keybindings",
					key: "keybindings",
					action: () => dispatch(openModal(WebviewModals.Keybindings))
				},
				// {
				// 	label: "Getting Started Guide",
				// 	key: "getting-started",
				// 	action: () => dispatch(openPanel(WebviewPanels.GettingStarted))
				// },
				{
					label: "CodeStream Flow",
					key: "flow",
					action: () => dispatch(openPanel(WebviewPanels.Flow))
				},
				{ label: "Onboard", key: "onboard", action: () => go(WebviewPanels.Onboard) },
				{
					label: "What's New",
					key: "whats-new",
					action: () => openUrl("https://www.codestream.com/blog")
				},
				{
					label: "Report an Issue",
					key: "issue",
					action: () => openUrl("https://github.com/TeamCodeStream/codestream/issues")
				}
			]
		},
		{ label: "-" }
	);

	// if (
	// 	derivedState.currentUserEmail &&
	// 	derivedState.currentUserEmail.indexOf("@codestream.com") > -1
	// ) {
	// 	menuItems[menuItems.length - 2].submenu.push({
	// 		label: "Tester",
	// 		key: "tester",
	// 		action: () => dispatch(openPanel(WebviewPanels.Tester))
	// 	});
	// }

	// menuItems.push({ label: "Sign Out", action: "signout" });

	// menuItems.push({ label: "-" });
	const text = (
		<span style={{ fontSize: "smaller" }}>
			This is CodeStream version {derivedState.pluginVersion}
		</span>
	);
	menuItems.push({ label: text, action: "", noHover: true, disabled: true });

	return (
		<Menu items={menuItems} target={props.menuTarget} action={props.closeMenu} align="bottomLeft" />
	);
}
