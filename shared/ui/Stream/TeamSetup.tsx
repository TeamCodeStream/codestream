import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HostApi } from "../webview-api";
import { UpdateCompanyRequestType } from "@codestream/protocols/agent";
import { Button } from "../src/components/Button";
import { Dialog, ButtonRow } from "../src/components/Dialog";

import styled from "styled-components";
import { closeModal } from "./actions";
import { CodeStreamState } from "../store";
import { logError } from "../logger";
import { difference as _difference, sortBy as _sortBy } from "lodash-es";

const Form = styled.form`
	h3 {
		margin: 0;
		color: var(--text-color-highlight);
	}
	b {
		color: var(--text-color-highlight);
	}
	a .icon {
		display: inline-block;
		margin-left: 5px;
		color: var(--text-color-subtle);
	}
	input[type="text"] {
		margin-top: 5px;
	}
`;

const HR = styled.div`
	border-top: 1px solid var(--base-border-color);
	margin: 20px -20px;
`;

interface Props {}

export const TeamSetup = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;
		const team = state.teams[state.context.currentTeamId];
		const user = state.users[state.session.userId!];

		return {
			webviewFocused: state.context.hasFocus,
			providers,

			currentTeam: team,
			currentUser: user,
			currentTeamId: state.context.currentTeamId,
			serverUrl: state.configs.serverUrl,
			company: state.companies[team.companyId] || {},
			team
		};
	});

	const [isLoading, setIsLoading] = useState(false);

	const [unexpectedError, setUnexpectedError] = useState(false);

	const [domainError, setDomainError] = useState("");
	const [domains, setDomainsText] = useState<string>(
		derivedState.company && derivedState.company.domainJoining != null
			? derivedState.company.domainJoining.join(",")
			: ""
	);

	const save = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();

		setIsLoading(true);
		try {
			try {
				setDomainError("");
				const domainsArray = domains
					.replace(/ /g, "")
					.replace(/(?:\r\n|\r|\n)/g, "")
					.split(",")
					.filter(Boolean);
				if (domainsArray && domainsArray.length) {
					for (const d of domainsArray) {
						if (d.indexOf(".") === -1) {
							throw new Error(`${d} is an invalid domain`);
						}
					}
				}
				await HostApi.instance.send(UpdateCompanyRequestType, {
					companyId: derivedState.company.id!,
					domainJoining: domainsArray
				});
				HostApi.instance.track("Domain Joining Updated");
			} catch (ex) {
				setDomainError(ex.message ? ex.message : ex.toString());
				setIsLoading(false);
				return;
			}

			dispatch(closeModal());
		} catch (error) {
			logError(`Unexpected error during update team settings: ${error}`, {});
			setUnexpectedError(true);
		}
		// @ts-ignore
		setIsLoading(false);
	};

	return (
		<>
			<Dialog title="">
				<Form className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<h3>Joining this Organization</h3>
							<p className="explainer">
								Allow people with emails from the following domains to join automatically:
							</p>

							<textarea
								style={{ width: "100%", height: "100px" }}
								name="domains"
								value={domains}
								onChange={event => setDomainsText(event.target.value)}
							/>
							<small>If you want to add more than one domain, separate each one with a comma</small>
							{domainError && (
								<>
									<br />
									<small className="explainer error-message">{domainError}</small>
								</>
							)}
						</div>

						<HR style={{ marginBottom: 0 }} />
						<ButtonRow>
							<Button
								variant="secondary"
								onClick={event => {
									event.preventDefault();
									dispatch(closeModal());
								}}
							>
								Cancel
							</Button>
							<Button onClick={save} isLoading={isLoading}>
								Save Onboarding Settings
							</Button>
						</ButtonRow>
					</fieldset>
				</Form>
			</Dialog>
			,<div style={{ height: "40px" }}></div>
		</>
	);
};
