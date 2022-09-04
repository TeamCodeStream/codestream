import React, { useCallback, useState } from "react";
import cx from "classnames";
import { CodeStreamState } from "../store";
import { useDispatch, useSelector } from "react-redux";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { Checkbox } from "../src/components/Checkbox";
import { Link } from "../Stream/Link";
import { UpdateTeamSettingsRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { setUserPreference } from "../Stream/actions";

const Root = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--base-background-color);
	ol {
		list-style-type: none;
		counter-reset: item;
		margin: 0;
		padding: 0;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style-type: disc;
	}
	ol > li {
		display: table;
		counter-increment: item;
		margin-bottom: 0.6em;
	}
	ol > li:before {
		content: counters(item, ".") ". ";
		display: table-cell;
		padding-right: 0.6em;
	}
	li ol > li {
		margin: 0;
	}
	li ol > li:before {
		content: counters(item, ".") " ";
	}
	hr {
		height: 1px;
		border: none;
		border-bottom: 1px solid var(--base-border-color);
		margin: 10px 0;
	}
`;

const Terms = styled.div`
	overflow: auto;
	flex-grow: 10;
	padding: 0 20px;
	background: var(--app-background-color);
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
	color: var(--text-color-subtle);
`;

const Title = styled.div`
	font-size: larger;
	padding: 20px;
	border-top: 1px solid var(--base-border-color);
`;

const Subtitle = styled.div`
	margin: 20px;
	font-size: larger;
`;

const Agreement = styled.div`
	margin: 10px 20px 0 20px;
`;

export const ButtonRow = styled.div`
	text-align: center;
	button {
		margin: 20px auto;
	}
`;

const PleaseScrollMore = styled.div`
	margin: 10px 0 0 0;
`;

const DownloadLink = styled.div`
	text-align: right;
	margin: 5px 10px 0 0;
`;

export const PresentPrereleaseTOS = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { teams, context, session, users } = state;
		const team = teams[context.currentTeamId];
		const user = users[session.userId!];
		const currentUserIsAdmin = (team.adminIds || []).includes(user.id);

		return { currentUserIsAdmin, team };
	});

	const [inAgreement, setInAgreement] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	const accept = async (event: React.SyntheticEvent) => {
		setIsLoading(true);

		if (derivedState.currentUserIsAdmin) {
			await HostApi.instance.send(UpdateTeamSettingsRequestType, {
				teamId: derivedState.team.id,
				settings: { acceptedPrereleaseTOS: true },
			});
		} else {
			dispatch(setUserPreference({ prefPath: ["acceptedPrereleaseTOS"], value: true }));
		}

		setIsLoading(false);
	};

	return (
		<Root>
			<Title>New Relic Pre-Release Agreement</Title>
			<Terms>
				<p>
					<b> 1. Acceptance</b>
					<br />
					By clicking “I Agree” below, you signify that you have read, understood, and accept the{" "}
					<Link href="https://docs.newrelic.com/docs/licenses/license-information/referenced-policies/new-relic-pre-release-policy">
						Pre-Release Policy
					</Link>{" "}
					(the “Policy”) and these terms (together the “Agreement”) which govern your use of alpha,
					beta, or any not generally available features or versions of New Relic’s services and
					products (the “Pre-Release Service(s)”). Your acceptance signifies that you have the legal
					authority to use the Pre-Release Service(s) personally or on behalf of the entity(ies)
					associated with your New Relic account.{" "}
				</p>

				<p>
					<b>2. General</b>
					<br />
					This Agreement will be governed by and construed in accordance with California law. The
					United Nations Convention on Contracts for the International Sale of Goods will not apply.
					Any legal action or proceeding arising under this Agreement will be brought exclusively in
					the federal or state courts located in San Francisco County, California, and the parties
					consent to such personal jurisdiction and venue. If any provision of this Agreement is
					held invalid or unenforceable by a court of competent jurisdiction, such provision will be
					construed so as to be enforceable to the maximum extent permissible by law, and the
					remaining provisions will remain in full force and effect. You may not assign this
					Agreement, by operation of law or otherwise, without the prior written consent of New
					Relic. Your obligations survive termination and are binding upon your agents,
					representatives, and successors. All notices or reports to New Relic must be sent by
					certified or registered mail, return receipt requested, to its corporate address and will
					be deemed given three (3) days after mailing. All notices or reports to you may be
					delivered electronically or by mail. This Agreement constitutes the entire agreement
					between the parties pertaining to any Pre-Release Service(s), and supersedes all prior
					communications and understandings regarding any Pre-Release Service(s). In the event of
					any inconsistency or ambiguity between this Agreement and any other contract between the
					parties related to any Pre-Release Service(s), this Agreement governs.
				</p>
			</Terms>
			<Agreement>
				<Checkbox name="agree" checked={inAgreement} onChange={() => setInAgreement(!inAgreement)}>
					I have read, understood, and agree to the Pre-Release Agreement.
				</Checkbox>
				<ButtonRow>
					<Button isLoading={isLoading} disabled={!inAgreement} onClick={accept}>
						Continue
					</Button>
				</ButtonRow>
			</Agreement>
		</Root>
	);
};
