import { UpdateTeamSettingsRequestType } from "@codestream/protocols/agent";
import { sortBy as _sortBy } from "lodash-es";
import React from "react";
import styled from "styled-components";
import {
	WebviewModals,
	OpenUrlRequestType,
	OpenEditorViewNotificationType,
} from "@codestream/protocols/webview";
import { logout, switchToTeamSSO } from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { WebviewPanels, SidebarPanes, CSPossibleAuthDomain } from "@codestream/protocols/api";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { openModal, setProfileUser } from "../store/context/actions";
import { HostApi } from "../webview-api";
import { openPanel } from "./actions";
import Icon from "./Icon";
import Menu from "./Menu";
import { AVAILABLE_PANES } from "./Sidebar";
import { EMPTY_STATUS } from "./StartWork";

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
		const companies = state.companies;
		const { environmentHosts, environment, isProductionCloud } = state.configs;
		const currentHost = environmentHosts?.find(host => host.shortName === environment);
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");

		let currentCompanyId;
		for (const key in companies) {
			if (companies[key].hasOwnProperty("linkedNROrgId")) {
				currentCompanyId = companies[key].linkedNROrgId;
			}
		}

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

		const possibleAuthDomains = _sortBy(user?.possibleAuthDomains, "authentication_domain_name");
		const currentOrg = possibleAuthDomains.find(
			company => company.organization_id === currentCompanyId
		);

		return {
			sidebarPanePreferences: sidebarPanes,
			sidebarPaneOrder: sidebarPaneOrder,
			userCompanies: _sortBy(Object.values(state.companies), "name"),
			userTeams: _sortBy(
				Object.values(state.teams).filter(t => t.deactivated),
				"name"
			),
			currentCompanyId,
			currentOrg,
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
			possibleAuthDomains,
			nrUserId: user?.nrUserId,
			ide: state.ide,
		};
	});

	const hasInvites =
		derivedState.eligibleJoinCompanies &&
		derivedState.eligibleJoinCompanies.some(company => company.byInvite && !company.accessToken);

	const trackSwitchOrg = (isCurrentCompany, company) => {
		const { currentUserEmail } = derivedState;

		HostApi.instance.track("codestream/user switched", { event_type: "submit" });
		// slight delay so tracking call completes
		setTimeout(() => {
			if (isCurrentCompany) return;

			const url = decodeURIComponent(company.login_url);
			const params = new URLSearchParams(new URL(url).search);
			const emailParam = params.get("email") || currentUserEmail || undefined;

			dispatch(
				switchToTeamSSO({
					nrUserId: company.user_id,
					email: emailParam,
					authDomainId: company.authentication_domain_id,
				})
			);
		}, 500);

		return;
	};

	const buildSwitchTeamMenuItem = () => {
		const { currentCompanyId, possibleAuthDomains, nrUserId } = derivedState;

		if (possibleAuthDomains.length < 2) {
			return null;
		}

		// Create new object with useDomainName property for use in
		// scenario where two matching orgs exist with differnt auth domains
		const organizationIdMap = new Map();

		possibleAuthDomains.forEach(item => {
			if (organizationIdMap.has(item.organization_id)) {
				organizationIdMap.get(item.organization_id).push(item);
			} else {
				organizationIdMap.set(item.organization_id, [item]);
			}
		});

		organizationIdMap.forEach(items => {
			if (items.length > 1) {
				items.forEach(item => {
					item.useDomainName = true;
				});
			}
		});

		const _possibleAuthDomains = ([] as CSPossibleAuthDomain[]).concat(
			...Array.from(organizationIdMap.values())
		);

		const buildSubmenu = () => {
			const items = _possibleAuthDomains.map(company => {
				let isCurrentCompany = company.organization_id === currentCompanyId;
				if (company.useDomainName) {
					isCurrentCompany = nrUserId === company.user_id;
				}

				let subtext =
					company?.useDomainName && company.authentication_domain_name
						? company?.authentication_domain_name
						: company.authentication_type
						? company.authentication_type
						: "";

				return {
					key: company.authentication_domain_id,
					label: (
						<>
							{company.organization_name}
							<RegionSubtext>{subtext}</RegionSubtext>
						</>
					),
					checked: isCurrentCompany,
					noHover: isCurrentCompany,
					action: () => {
						trackSwitchOrg(isCurrentCompany, company);
					},
				};
			}) as any;

			return items;
		};

		return {
			label: (
				<>
					{hasInvites ? (
						<>
							<span>Switch Users</span>
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
						<span>Switch Users</span>
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
					label: "Export Data",
					key: "export-data",
					action: () => go(WebviewPanels.Export),
					disabled: false,
				},
			];

			return {
				label: "Organization Admin",
				key: "admin",
				submenu,
			};
		} else return null;
	};

	const menuItems = [] as any;

	interface SubmenuOption {
		label: string;
		action?: () => void;
	}
	let accountSubmenu: SubmenuOption[] = [];

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
				{ label: "Change Username", action: () => popup(WebviewModals.ChangeUsername) },
				{ label: "-" },
				{ label: "Sign Out", action: () => dispatch(logout()) },
			],
		},
		{
			label: "Notifications",
			action: () => dispatch(openModal(WebviewModals.Notifications)),
		},
		{ label: "Integrations", action: () => dispatch(openPanel(WebviewPanels.Integrations)) },
		{
			label: "Blame Map",
			action: () => dispatch(openModal(WebviewModals.BlameMap)),
		}
	);

	menuItems.push(
		...[
			{ label: "-" },
			{
				label: (
					<>
						<h3>{derivedState.currentOrg?.organization_name}</h3>
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
					label: "What's New",
					key: "whatsnew",
					action: () => {
						HostApi.instance.notify(OpenEditorViewNotificationType, {
							panel: "whatsnew",
							title: "What's New",
							entryPoint: "profile",
							entityAccounts: [],
							ide: {
								name: derivedState.ide.name,
							},
						});
					},
				},
				{
					label: "Documentation",
					key: "documentation",
					action: () => openUrl("https://docs.newrelic.com/docs/codestream"),
				},
				//{
				//	label: "Keybindings",
				//	key: "keybindings",
				//	action: () => dispatch(openModal(WebviewModals.Keybindings)),
				//},
				// {
				// 	label: "Getting Started Guide",
				// 	key: "getting-started",
				// 	action: () => dispatch(openPanel(WebviewPanels.GettingStarted))
				// },
				{
					label: "Support",
					key: "issue",
					action: () => openUrl("https://one.newrelic.com/help-xp"),
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
