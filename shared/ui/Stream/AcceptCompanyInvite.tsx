import {
	DeclineInviteRequest,
	DeclineInviteRequestType,
	DeclineInviteResponse,
} from "@codestream/protocols/agent";
import { sortBy as _sortBy } from "lodash-es";
import React from "react";
import styled from "styled-components";

import { logout, setEnvironment } from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { goToLogin, goToSignup } from "../store/context/actions";
import { closeModal } from "./actions";

export function AcceptCompanyInvite() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { environmentHosts, environment } = state.configs;
		const currentHost = environmentHosts?.find(host => host.shortName === environment);
		const user = state.users[state.session.userId!];
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");

		return {
			currentOrganizationInvite: state.context.currentOrganizationInvite,
			hasMultipleEnvironments: environmentHosts && environmentHosts.length > 1,
			userId: state.session.userId,
			userEmail: user.email,
			serverUrl: state.configs.serverUrl,
			eligibleJoinCompanies: _sortBy(user?.eligibleJoinCompanies, "name"),
			currentHost,
			supportsMultiRegion,
		};
	});

	const ButtonRow = styled.div`
		text-align: center;
		margin-top: 20px;
		display: flex;
		margin: 20px -10px 0 -10px;
		button {
			flex-grow: 1;
			margin: 0 10px;
			width: 100%;
			padding: 5px 10px;
			line-height: 1.25em;
		}
	`;

	const inviteRegion =
		derivedState.supportsMultiRegion &&
		derivedState.hasMultipleEnvironments &&
		derivedState.currentOrganizationInvite?.host?.shortName;
	const companyRegion =
		derivedState.supportsMultiRegion &&
		derivedState.hasMultipleEnvironments &&
		derivedState.currentHost?.shortName;
	const inviteIsFromForeignRegion = companyRegion && inviteRegion && companyRegion !== inviteRegion;

	const handleClickAccept = async () => {
		const { currentOrganizationInvite } = derivedState;

		try {
			if (currentOrganizationInvite.host) {
				// now switch environments (i.e., host, region, etc) to join this organization
				console.log(
					`Joining company ${currentOrganizationInvite.name} requires switching host to ${currentOrganizationInvite.host.name} at ${currentOrganizationInvite.host.publicApiUrl}`
				);
				await dispatch(
					setEnvironment(
						currentOrganizationInvite.host.shortName,
						currentOrganizationInvite.host.publicApiUrl
					)
				);
			}
			await dispatch(logout());
			await dispatch(
				goToSignup({ joinCompanyId: currentOrganizationInvite.id, email: derivedState.userEmail })
			);

			/*
			const request: JoinCompanyRequest = {
				companyId: currentOrganizationInvite.id,
			};
			if (currentOrganizationInvite.host) {
				// explicitly add the environment to the request, since the switch-over may still be in progress
				// NOTE: we also add the server we are switching TO, since the call to set environments, above,
				// may not have actually sync'd through to the agent
				// isn't this fun???
				request.fromEnvironment = {
					serverUrl: derivedState.serverUrl,
					userId: derivedState.userId!,
					toServerUrl: currentOrganizationInvite.host.publicApiUrl,
				};
			}
			const result = (await HostApi.instance.send(
				JoinCompanyRequestType,
				request
			)) as JoinCompanyResponse;

			// HostApi.instance.track("Joined Organization", {
			// 	Availability: "Invite",
			// 	"Auth Provider": "CodeStream",
			// 	Location: "In-product",
			// });

			// slight delay so tracking call completes before ide refreshes
			setTimeout(() => {
				dispatch(
					switchToTeam({
						teamId: result?.teamId,
						accessTokenFromEligibleCompany: result?.accessToken,
					})
				);

				dispatch(closeModal());
			}, 500);
			*/
		} catch (error) {
			const errorMessage = typeof error === "string" ? error : error.message;
			logError(`Unexpected error during company join: ${errorMessage}`, {
				companyId: currentOrganizationInvite.id,
			});
			dispatch(closeModal());
			dispatch(goToLogin());
		}
	};

	const handleClickDecline = async () => {
		const { eligibleJoinCompanies, currentOrganizationInvite } = derivedState;

		if (inviteIsFromForeignRegion) {
			dispatch(closeModal());
			return;
		}

		const request: DeclineInviteRequest = {
			companyId: currentOrganizationInvite.id,
		};
		if (currentOrganizationInvite.host) {
			// explicitly add the environment to the request, since the switch-over may still be in progress
			// NOTE: we also add the server we are switching TO, since the call to set environments, above,
			// may not have actually sync'd through to the agent
			// isn't this fun???
			request.fromEnvironment = {
				serverUrl: derivedState.serverUrl,
				userId: derivedState.userId!,
				toServerUrl: currentOrganizationInvite.host.publicApiUrl,
			};
		}

		const result = (await HostApi.instance.send(
			DeclineInviteRequestType,
			request
		)) as DeclineInviteResponse;

		dispatch(closeModal());
	};

	return (
		<Dialog title="Accept Invitation?" onClose={() => dispatch(closeModal())}>
			<p style={{ wordBreak: "break-word" }}>
				Do you want to accept your inviation to join {derivedState.currentOrganizationInvite?.name}?
			</p>
			<ButtonRow>
				<Button onClick={handleClickAccept} tabIndex={0}>
					Accept
				</Button>
				{inviteIsFromForeignRegion && (
					<Button variant="destructive" onClick={handleClickDecline} tabIndex={0}>
						Cancel
					</Button>
				)}
				{!inviteIsFromForeignRegion && (
					<Button variant="destructive" onClick={handleClickDecline} tabIndex={0}>
						Decline
					</Button>
				)}
			</ButtonRow>
		</Dialog>
	);
}
