import React, { useState } from "react";
import styled from "styled-components";

import {
	configureAndConnectProvider,
	disconnectProvider,
	removeEnterpriseProvider,
} from "@codestream/webview/store/providers/actions";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { getConnectedSharingTargets, isConnected } from "../store/providers/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { closePanel } from "./actions";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { DropdownButton } from "./DropdownButton";
import Icon from "./Icon";
import { PrePRProviderInfoModal } from "./PrePRProviderInfoModal";
import { currentUserIsAdminSelector } from "@codestream/webview/store/users/reducer";
import { shallowEqual } from "react-redux";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";

export const Provider = styled(Button)`
	width: 100%;
	justify-content: left;
	text-align: left;
	.icon {
		margin-right: 5px;
	}
	position: relative;
`;

const ProviderDropdown = styled(DropdownButton)`
	width: 100%;
	button {
		width: 100%;
		justify-content: left;
		text-align: left;
		.icon {
			margin-right: 5px;
		}
		.chevron-down {
			float: right;
			margin-right: 0;
		}
		> span {
			width: 100%;
		}
	}
`;

const IntegrationGroups = styled.div`
	h2 {
		margin-top: 15px;
		font-size: 16px !important;
		font-weight: 400;
		padding: 0 0 0 20px;
	}
	p {
		padding: 0 20px;
	}
`;

export const IntegrationButtons = styled.div<{ noBorder?: boolean; noPadding?: boolean }>`
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(13em, 1fr));
	column-gap: 15px;
	row-gap: 10px;
	padding: ${props => (props.noPadding ? "0" : "0 20px 20px 20px")};
	border-bottom: ${props => (props.noBorder ? "none" : "1px solid var(--base-border-color)")};
	align-items: start;
`;

export const IntegrationsPanel = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers, teams, context, session, users, configs } = state;
		const team = teams[context.currentTeamId];
		const teamSettings = team.settings || {};
		const teamCodeHostProviders = teamSettings.codeHostProviders || {};
		const teamIssuesProviders = teamSettings.issuesProviders || {};
		const teamMessagingProviders = teamSettings.messagingProviders || {};
		const user = users[session.userId!];
		const currentUserIsAdmin = currentUserIsAdminSelector(state);

		const connectedProviders = Object.keys(providers)
			.filter(id => isConnected(state, { id }))
			.filter(id => providers[id].name !== "newrelic");

		const observabilityProviders = Object.keys(providers)
			.filter(id => ["newrelic"].includes(providers[id].name))
			.filter(id => !connectedProviders.includes(id))
			.sort((a, b) => providers[a].name.localeCompare(providers[b].name));
		const issueProviders = Object.keys(providers)
			.filter(id => providers[id].hasIssues)
			.filter(id => !connectedProviders.includes(id))
			.filter(id => !teamSettings.limitIssues || teamIssuesProviders[id])
			.sort((a, b) => providers[a].name.localeCompare(providers[b].name));
		const messagingProviders = Object.keys(providers)
			.filter(id => providers[id].hasSharing)
			.filter(id => !teamSettings.limitMessaging || teamMessagingProviders[id])
			.sort((a, b) => providers[a].name.localeCompare(providers[b].name));
		const codeAnalyzersProviders = Object.keys(providers)
			.filter(id => ["fossa"].includes(providers[id].name))
			.filter(id => !connectedProviders.includes(id))
			.sort((a, b) => providers[a].name.localeCompare(providers[b].name));
		const cicdProviders = Object.keys(providers)
			.filter(id => ["circleci"].includes(providers[id].name))
			.filter(id => !connectedProviders.includes(id))
			.sort((a, b) => providers[a].name.localeCompare(providers[b].name));
		const sharingTargets = getConnectedSharingTargets(state);

		return {
			webviewFocused: state.context.hasFocus,
			providers,
			observabilityProviders,
			issueProviders,
			messagingProviders,
			codeAnalyzersProviders,
			cicdProviders,
			connectedProviders,
			sharingTargets,
			currentTeam: team,
			currentUser: user,
			currentUserIsAdmin,
			isOnPrem: configs.isOnPrem,
			showCodeAnalyzers: isFeatureEnabled(state, "showCodeAnalyzers"),
		};
	}, shallowEqual);

	const [propsForPrePRProviderInfoModal, setPropsForPrePRProviderInfoModal] = useState<any>();

	const renderDisplayHost = host => {
		return host.startsWith("http://")
			? host.split("http://")[1]
			: host.startsWith("https://")
			? host.split("https://")[1]
			: host;
	};

	const renderConnectedProviders = providerIds => {
		const { providers } = derivedState;
		return providerIds.map(providerId => {
			if (providerId === "newrelic*com") return null;
			const provider = providers[providerId];
			const { name, isEnterprise, host } = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (!display) return null;

			if (provider.hasSharing) {
				return derivedState.sharingTargets.map(shareTarget => {
					if (shareTarget.providerId !== provider.id) return null;

					const items = [
						{
							label: "Disconnect",
							action: () =>
								dispatch(disconnectProvider(providerId, "Integrations Panel", shareTarget.teamId)),
						},
					];
					return (
						<ProviderDropdown key={providerId} items={items} variant="success">
							{display.icon && <Icon name={display.icon} />}
							{display.displayName} - {shareTarget.teamName}
						</ProviderDropdown>
					);
				});
			}

			const displayHost = renderDisplayHost(host);
			const displayName = isEnterprise
				? `${display.displayName} - ${displayHost}`
				: display.displayName;
			const items = [
				{
					label: "Disconnect",
					action: () => dispatch(disconnectProvider(providerId, "Integrations Panel")),
				},
			];
			if (isEnterprise && derivedState.currentUserIsAdmin) {
				items.push({
					label: "Remove host",
					action: () => dispatch(removeEnterpriseProvider(providerId)),
				});
			}
			return (
				<ProviderDropdown key={providerId} items={items} variant="success">
					{display.icon && <Icon name={display.icon} />}
					{display.hideDisplayName ? "" : displayName}
				</ProviderDropdown>
			);
		});
	};

	const renderProviders = providerIds => {
		const { providers } = derivedState;
		return providerIds.map(providerId => {
			const provider = providers[providerId];
			const { name, isEnterprise, host } = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (!display) return null;

			const displayHost = renderDisplayHost(host);
			let displayName = isEnterprise
				? `${display.displayName} - ${displayHost}`
				: display.displayName;
			displayName = display.hideDisplayName ? "" : display.displayName;

			const action = () => dispatch(configureAndConnectProvider(providerId, "Integrations Panel"));
			/*

			// Per https://newrelic.atlassian.net/browse/CDSTRM-1591, the need for the "pre-PR" modal
			// is discontinued ... if we bring it back, suggest we figure out a way not to repeat the
			// logic below across all our launch integration points - Colin

			let action;
			if (needsConfigure || (derivedState.isOnPrem && needsConfigureForOnPrem)) {
				// otherwise, if it's a provider that needs to be pre-configured,
				// bring up the custom popup for configuring it
				action = () =>
					dispatch(openPanel(`configure-provider-${name}-${providerId}-Integrations Panel`));
			} else if ((forEnterprise || isEnterprise) && name !== "jiraserver") {
				// otherwise if it's for an enterprise provider, configure for enterprise
				action = () => {
					dispatch(openPanel(`configure-enterprise-${name}-${providerId}-Integrations Panel`));
				};
			} else {
				// otherwise it's just a simple oauth redirect
				if (name === "github" || name === "bitbucket" || name === "gitlab") {
					action = () =>
						setPropsForPrePRProviderInfoModal({
							providerName: name,
							action: () => dispatch(connectProvider(providerId, "Integrations Panel")),
							onClose: () => setPropsForPrePRProviderInfoModal(undefined)
						});
				} else
					action = () => dispatch(connectProvider(providerId, "Integrations Panel"));
			}
			*/
			if (isEnterprise && derivedState.currentUserIsAdmin) {
				const items = [
					{
						label: "Connect",
						action,
					},
					{
						label: "Remove host",
						action: () => dispatch(removeEnterpriseProvider(providerId)),
					},
				];
				return (
					<ProviderDropdown key={providerId} items={items}>
						{display.icon && <Icon name={display.icon} />}
						{displayName}
					</ProviderDropdown>
				);
			} else {
				return (
					<Provider key={providerId} onClick={action}>
						{display.icon && <Icon name={display.icon} />}
						{displayName}
					</Provider>
				);
			}
		});
	};

	const renderMessagingProviders = () => {
		const { providers, connectedProviders } = derivedState;
		return derivedState.messagingProviders.map(providerId => {
			const provider = providers[providerId];
			const { name } = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (!display) return null;

			let elements = [] as any;
			if (connectedProviders.includes(providerId)) {
				elements.push(
					<Provider
						key={providerId}
						onClick={() => dispatch(configureAndConnectProvider(providerId, "Integrations Panel"))}
					>
						{display.icon && <Icon name={display.icon} />}
						{`Add ${display.displayName} ${display.groupName}`}
					</Provider>
				);
			} else
				elements.push(
					<Provider
						key={providerId}
						onClick={() => dispatch(configureAndConnectProvider(providerId, "Integrations Panel"))}
					>
						{display.icon && <Icon name={display.icon} />}
						{display.displayName}
					</Provider>
				);
			return elements;
		});
	};

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Integrations" });
	});

	if (propsForPrePRProviderInfoModal) {
		return <PrePRProviderInfoModal {...propsForPrePRProviderInfoModal} />;
	}

	return (
		<Dialog wide noPadding onClose={() => dispatch(closePanel())}>
			<IntegrationGroups>
				{Object.keys(derivedState.providers).length === 0 && (
					<>
						<h2>No Integrations Available</h2>
						<p>
							This version of CodeStream On-Prem is not configured for any integrations. Please
							contact your on-prem CodeStream administrator.
						</p>
						<div style={{ textAlign: "center", marginBottom: "20px" }}>
							<Button onClick={() => dispatch(closePanel())}>OK</Button>
						</div>
					</>
				)}
				{Object.keys(derivedState.providers).length > 0 && (
					<>
						{derivedState.connectedProviders.length > 0 && (
							<>
								<h2>Active Integrations</h2>
								<IntegrationButtons>
									{renderConnectedProviders(derivedState.connectedProviders)}
								</IntegrationButtons>
							</>
						)}
						{/* 
							{derivedState.observabilityProviders.length > 0 && (
								<>
									<h2>Observability</h2>
									<IntegrationButtons>
										{renderProviders(derivedState.observabilityProviders)}
									</IntegrationButtons>
								</>
							)}
						*/}
						<h2>Issue Providers</h2>
						<IntegrationButtons>{renderProviders(derivedState.issueProviders)}</IntegrationButtons>

						{derivedState.codeAnalyzersProviders.length > 0 && derivedState.showCodeAnalyzers && (
							<>
								<h2>Code Analyzers</h2>
								<IntegrationButtons>
									{renderProviders(derivedState.codeAnalyzersProviders)}
								</IntegrationButtons>
							</>
						)}

						<h2>Messaging Providers</h2>
						<IntegrationButtons noBorder>{renderMessagingProviders()}</IntegrationButtons>
					</>
				)}
			</IntegrationGroups>
		</Dialog>
	);
};
