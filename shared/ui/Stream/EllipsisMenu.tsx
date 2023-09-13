import {
	UpdateTeamSettingsRequestType,
	DeleteCompanyRequestType,
} from "@codestream/protocols/agent";
import { isEmpty as _isEmpty, sortBy as _sortBy } from "lodash-es";
import React from "react";
import styled from "styled-components";
import {
	WebviewModals,
	WebviewPanelNames,
	OpenUrlRequestType,
} from "@codestream/protocols/webview";
import { multiStageConfirmPopup } from "./MultiStageConfirm";
import {
	logout,
	switchToForeignCompany,
	switchToTeam,
} from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { WebviewPanels, SidebarPanes } from "@codestream/protocols/api";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { openModal, setCurrentOrganizationInvite, setProfileUser } from "../store/context/actions";
import { HostApi } from "../webview-api";
import { openPanel } from "./actions";
import Icon from "./Icon";
import { MarkdownText } from "./MarkdownText";
import Menu from "./Menu";
import { AVAILABLE_PANES, DEFAULT_PANE_SETTINGS } from "./Sidebar";
import { EMPTY_STATUS } from "./StartWork";
import { getDomainFromEmail } from "@codestream/webview/utils";

const RegionSubtext = styled.div`
	font-size: smaller;
	margin: 0 0 0 21px;
	color: var(--text-color-subtle);
`;

export const MailHighlightedIconWrapper = styled.div`
	right: 4px;
	border-radius: 50%;
	width: 15px;
	height: 15px;
	top: 10px;
	color: var(--text-color-highlight);
	text-align: center;
	font-size: 11px;
	display: inline;
	background: var(--text-color-info-muted);
`;

export const VALID_DELETE_ORG_EMAIL_DOMAINS = ["codestream.com", "newrelic.com", "testinator.com"];

interface EllipsisMenuProps {
	menuTarget: any;
	closeMenu: any;
}

const EMPTY_HASH = {};

export function EllipsisMenu(props: EllipsisMenuProps) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		const user = state.users[state.session.userId!];
		const onPrem = state.configs.isOnPrem;
		const currentCompanyId = team.companyId;
		const { environmentHosts, environment, isProductionCloud } = state.configs;
		const currentHost = environmentHosts?.find(host => host.shortName === environment);
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");

		let sidebarPanes: SidebarPanes = state.preferences.sidebarPanes || (EMPTY_HASH as SidebarPanes);
		let sidebarPaneOrder: WebviewPanels[] = state.preferences.sidebarPaneOrder || AVAILABLE_PANES;
		if (!isFeatureEnabled(state, "showCodeAnalyzers")) {
			// Filter by key name
			sidebarPanes = Object.keys(sidebarPanes)
				.filter(key => key !== WebviewPanels.CodeAnalyzers)
				.reduce((obj, key) => {
					obj[key] = sidebarPanes[key];
					return obj;
				}, {} as SidebarPanes);
			sidebarPaneOrder = sidebarPaneOrder.filter(_ => _ !== WebviewPanels.CodeAnalyzers);
		}

		return {
			sidebarPanePreferences: sidebarPanes,
			sidebarPaneOrder: sidebarPaneOrder,
			userCompanies: _sortBy(Object.values(state.companies), "name"),
			userTeams: _sortBy(
				Object.values(state.teams).filter(t => t.deactivated),
				"name"
			),
			currentCompanyId,
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
			isOnPrem: onPrem,
			currentHost,
			hasMultipleEnvironments: environmentHosts && environmentHosts.length > 1,
			environment,
			isProductionCloud,
			supportsMultiRegion,
			eligibleJoinCompanies: _sortBy(user?.eligibleJoinCompanies, "name"),
		};
	});

	const hasInvites =
		derivedState.eligibleJoinCompanies &&
		derivedState.eligibleJoinCompanies.some(company => company.byInvite && !company.accessToken);

	const trackSwitchOrg = (isCurrentCompany, company) => {
		HostApi.instance.track("Switched Organizations", {});
		// slight delay so tracking call completes
		setTimeout(() => {
			const { eligibleJoinCompanies } = derivedState;
			const isInvited = company.byInvite && !company.accessToken;
			if (isCurrentCompany) return;
			if (company.host && !isInvited) {
				dispatch(switchToForeignCompany(company.id));
			} else if (isInvited) {
				dispatch(setCurrentOrganizationInvite(company.name, company.id, company.host));
				dispatch(openModal(WebviewModals.AcceptCompanyInvite));
			} else {
				const eligibleCompany = eligibleJoinCompanies.find(_ => _.id === company.id);
				if (eligibleCompany?.teamId) {
					dispatch(
						switchToTeam({
							teamId: eligibleCompany.teamId,
							accessTokenFromEligibleCompany: eligibleCompany?.accessToken,
						})
					);
				} else {
					console.error(`Could not switch to a team in company ${company.id}`);
				}
			}
		}, 500);

		return;
	};

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
								handleLogout();
							},
						},
					],
				},
			],
		});
	};

	const buildSwitchTeamMenuItem = () => {
		const {
			eligibleJoinCompanies,
			currentCompanyId,
			currentHost,
			hasMultipleEnvironments,
			supportsMultiRegion,
		} = derivedState;

		const buildSubmenu = () => {
			const items = eligibleJoinCompanies
				.filter(company => {
					// Skip companys eligible to join by domain and are signed out with no invite
					const domainJoining = company?.domainJoining;
					const canJoinByDomain = !_isEmpty(domainJoining);
					const isSignedOut = !company.byInvite && !company.accessToken;
					if (canJoinByDomain || isSignedOut) return false;
					return true;
				})
				.map(company => {
					const isCurrentCompany = company.id === currentCompanyId;
					const isInvited = company.byInvite && !company.accessToken;
					const companyHost = company.host || currentHost;
					const companyRegion =
						supportsMultiRegion && hasMultipleEnvironments && companyHost?.shortName;

					// @TODO: add in for UI phase 2, with "Signed Out" messaging as well
					// const signedStatusText = isInvited ? "Invited" : "Signed In";
					let checked: any;
					if (isCurrentCompany) {
						checked = true;
					} else if (isInvited) {
						checked = "custom";
					} else {
						checked = false;
					}

					return {
						key: company.id,
						label: (
							<>
								{company.name}
								<RegionSubtext>{companyRegion && <>{companyRegion}</>}</RegionSubtext>
							</>
						),
						checked: checked,
						noHover: isCurrentCompany,
						action: () => {
							trackSwitchOrg(isCurrentCompany, company);
						},
					};
				}) as any;

			items.push(
				{ label: "-" },
				{
					key: "create-company",
					icon: <Icon name="plus" />,
					label: "Create New Organization",
					action: () => {
						dispatch(openModal(WebviewModals.CreateCompany));
					},
				},
				//@TODO: change action to idp signin
				{
					key: "sign-in-other",
					icon: <Icon name="plus" />,
					label: "Sign In to Another Organization",
					action: () => {
						console.warn("sign in action for idp goes here");
					},
				}
			);

			return items;
		};

		return {
			label: (
				<>
					{hasInvites ? (
						<>
							<span>Switch Organization</span>
							<Icon
								style={{
									background: "var(--text-color-info-muted)",
									color: "var(--text-color-highlight)",
									borderRadius: "50%",
									margin: "0px 0px 0px 5px",
									padding: "3px 4px 3px 4px",
								}}
								name="mail"
							/>
						</>
					) : (
						<span>Switch Organization</span>
					)}
				</>
			),
			submenu: buildSubmenu(),
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
			settings: { xray: value },
		});
	};

	const handleLogout = async () => {
		dispatch(logout());
	};

	const buildAdminTeamMenuItem = () => {
		const { company, team, currentUserId, currentUserEmail } = derivedState;
		const { adminIds } = team;

		if (adminIds && adminIds.includes(currentUserId!)) {
			const submenu = [
				{
					label: "Change Organization Name",
					key: "change-company-name",
					action: () => dispatch(openModal(WebviewModals.ChangeCompanyName)),
				},
				{ label: "-" },
				{
					label: "Onboarding Settings...",
					key: "onboarding-settings",
					action: () => dispatch(openModal(WebviewModals.TeamSetup)),
					disabled: !derivedState.autoJoinSupported,
				},

				{ label: "-" },

				{
					label: "Export Data",
					key: "export-data",
					action: () => go(WebviewPanels.Export),
					disabled: false,
				},

				{ label: "-" },
				{
					label: "Export Data",
					key: "export-data",
					action: () => go(WebviewPanels.Export),
					disabled: false,
				},
			];

			const emailDomain = getDomainFromEmail(currentUserEmail!);
			if (emailDomain && VALID_DELETE_ORG_EMAIL_DOMAINS.includes(emailDomain)) {
				submenu.push.apply(submenu, [
					{ label: "-" },
					{
						label: "Delete Organization",
						key: "delete-organization",
						action: deleteOrganization,
						disabled: false,
					},
				]);
			}

			return {
				label: "Organization Admin",
				key: "admin",
				submenu,
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
			key: "status",
		});
	}

	interface SubmenuOption {
		label: string;
		action?: () => void;
	}
	let accountSubmenu: SubmenuOption[] = [];
	const { company } = derivedState;
	if (company.codestreamOnly) {
		accountSubmenu = [
			{
				label: "View Profile",
				action: () => {
					dispatch(setProfileUser(derivedState.currentUserId));
					popup(WebviewModals.Profile);
				},
			},
			{ label: "Change Profile Photo", action: () => popup(WebviewModals.ChangeAvatar) },
			{ label: "Change Email", action: () => popup(WebviewModals.ChangeEmail) },
			{ label: "Change Username", action: () => popup(WebviewModals.ChangeUsername) },
			{ label: "Change Full Name", action: () => popup(WebviewModals.ChangeFullName) },
			{ label: "-" },
			{ label: "Sign Out", action: () => handleLogout() },
		];
	} else {
		accountSubmenu = [
			{
				label: "View Profile",
				action: () => {
					dispatch(setProfileUser(derivedState.currentUserId));
					popup(WebviewModals.Profile);
				},
			},
			{ label: "Change Profile Photo", action: () => popup(WebviewModals.ChangeAvatar) },
			{ label: "Change Username", action: () => popup(WebviewModals.ChangeUsername) },
			{ label: "-" },
			{ label: "Sign Out", action: () => handleLogout() },
		];
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
						popup(WebviewModals.Profile);
					},
				},
				{ label: "Change Email", action: () => popup(WebviewModals.ChangeEmail) },
				{ label: "Change Username", action: () => popup(WebviewModals.ChangeUsername) },
				{ label: "Change Full Name", action: () => popup(WebviewModals.ChangeFullName) },
				{ label: "-" },
				{ label: "Sign Out", action: () => dispatch(logout()) },
			],
		},
		{
			label: "Notifications",
			action: () => dispatch(openModal(WebviewModals.Notifications)),
		},
		{ label: "Integrations", action: () => dispatch(openPanel(WebviewPanels.Integrations)) }
	);

	menuItems.push(
		...[
			{ label: "-" },
			{
				label: (
					<>
						<h3>{derivedState.company.name}</h3>
						{derivedState.currentHost && derivedState.hasMultipleEnvironments && (
							<small>{derivedState.currentHost.name}</small>
						)}
					</>
				),
				key: "companyHeader",
				noHover: true,
				disabled: true,
			},
			// {
			// 	label: `Invite people to ${derivedState.team.name}`,
			// 	action: () => dispatch(openModal(WebviewModals.Invite))
			// },
			buildAdminTeamMenuItem(),
			buildSwitchTeamMenuItem(),
			{ label: "-" },
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
		{
			label: "Help",
			key: "help",
			submenu: [
				{
					label: "Documentation",
					key: "documentation",
					action: () => openUrl("https://docs.newrelic.com/docs/codestream"),
				},
				{
					label: "Keybindings",
					key: "keybindings",
					action: () => dispatch(openModal(WebviewModals.Keybindings)),
				},
				// {
				// 	label: "Getting Started Guide",
				// 	key: "getting-started",
				// 	action: () => dispatch(openPanel(WebviewPanels.GettingStarted))
				// },
				{
					label: "Report an Issue",
					key: "issue",
					action: () => openUrl("https://github.com/TeamCodeStream/codestream/issues"),
				},
			],
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
	let versionStatement = `This is CodeStream version ${derivedState.pluginVersion}`;
	if (!derivedState.isProductionCloud || derivedState.hasMultipleEnvironments) {
		versionStatement += ` (${derivedState.environment.toLocaleUpperCase()})`;
	}
	const text = <span style={{ fontSize: "smaller" }}>{versionStatement}</span>;
	menuItems.push({ label: text, action: "", noHover: true, disabled: true });
	// &#9993;
	return (
		<Menu
			customIcon={
				<Icon
					style={{
						background: "var(--text-color-info-muted)",
						color: "var(--text-color-highlight)",
						borderRadius: "50%",
						margin: "0px 0px 0px -5px",
						padding: "3px 4px 3px 4px",
						top: "5px",
						right: "2px",
					}}
					name="mail"
				/>
			}
			items={menuItems}
			target={props.menuTarget}
			action={props.closeMenu}
			align="bottomLeft"
		/>
	);
}
