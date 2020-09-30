import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HostApi } from "../webview-api";
import { UpdateTeamRequestType, UpdateTeamSettingsRequestType } from "@codestream/protocols/agent";
import { Button } from "../src/components/Button";
import { Dialog, ButtonRow } from "../src/components/Dialog";
import { Link } from "./Link";
import { Checkbox } from "../src/components/Checkbox";
import styled from "styled-components";
import { closeModal } from "./actions";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { Radio, RadioGroup } from "../src/components/RadioGroup";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { logError } from "../logger";
import { TextInput } from "../Authentication/TextInput";
import Icon from "./Icon";
import { getConnectedSharingTargets, isConnected } from "../store/providers/reducer";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { SmartFormattedList } from "./SmartFormattedList";

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

const PreConfigure = styled.div`
	white-space: nowrap;
	margin-top: 10px;
`;

interface Props {
	onClose: Function;
}

const isNotEmpty = s => s.length > 0;

const CODE_HOSTS = [
	"github",
	"github_enterprise",
	"bitbucket",
	"bitbucket_server",
	"gitlab",
	"gitlab_enterprise"
];

export function TeamSetup(props: Props) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;
		const team = state.teams[state.context.currentTeamId];
		const user = state.users[state.session.userId!];

		const connectedProviders = Object.keys(providers).filter(id => isConnected(state, { id }));
		const codeHostProviders = Object.keys(providers).filter(id =>
			CODE_HOSTS.includes(providers[id].name)
		);
		const issueProviders = Object.keys(providers)
			.filter(id => providers[id].hasIssues)
			.filter(id => !CODE_HOSTS.includes(id));
		const messagingProviders = Object.keys(providers).filter(id => providers[id].hasSharing);
		const sharingTargets = getConnectedSharingTargets(state);

		return {
			webviewFocused: state.context.hasFocus,
			providers,
			codeHostProviders,
			issueProviders,
			messagingProviders,
			connectedProviders,
			sharingTargets,
			currentTeam: team,
			currentUser: user,
			currentTeamId: state.context.currentTeamId,
			serverUrl: state.configs.serverUrl,
			company: state.companies[team.companyId] || {},
			team,
			currentUserId: state.session.userId,
			pluginVersion: state.pluginVersion,
			xraySetting: team.settings ? team.settings.xray : "",
			multipleReviewersApprove: isFeatureEnabled(state, "multipleReviewersApprove")
		};
	});
	const { team, providers, connectedProviders, xraySetting } = derivedState;

	const [isLoading, setIsLoading] = useState(false);
	const [recommended, setRecommended] = useState(true);
	const [configure, setConfigure] = useState(true);
	const [teamName, setTeamName] = useState(derivedState.team.name);
	const [teamNameValidity, setTeamNameValidity] = useState(true);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const connected = id => connectedProviders.includes(id);

	const codeHostItems = derivedState.codeHostProviders.map(id => {
		const label = PROVIDER_MAPPINGS[providers[id].name].displayName;
		return {
			key: id,
			label,
			checked: connected(id)
		};
	});
	const codeHostLabel = (
		<SmartFormattedList
			value={derivedState.codeHostProviders
				.filter(id => connected(id))
				.map(id => PROVIDER_MAPPINGS[providers[id].name].displayName)}
		></SmartFormattedList>
	);

	const messagingItems = derivedState.messagingProviders.map(id => {
		const label = PROVIDER_MAPPINGS[providers[id].name].displayName;
		return {
			key: id,
			label,
			checked: connected(id)
		};
	});
	const messagingLabel = (
		<SmartFormattedList
			value={derivedState.messagingProviders
				.filter(id => connected(id))
				.map(id => PROVIDER_MAPPINGS[providers[id].name].displayName)}
		></SmartFormattedList>
	);

	const issueItems = derivedState.issueProviders.map(id => {
		const label = PROVIDER_MAPPINGS[providers[id].name].displayName;
		return {
			key: id,
			label,
			checked: connected(id)
		};
	});
	const issueLabel = (
		<SmartFormattedList
			value={derivedState.issueProviders
				.filter(id => connected(id))
				.map(id => PROVIDER_MAPPINGS[providers[id].name].displayName)}
		></SmartFormattedList>
	);

	const save = () => {
		// if modified extensions.json or .codestreamconfig then prompt to push
	};

	const changeXray = async value => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: derivedState.team.id,
			settings: { xray: value }
		});
	};

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "teamName":
				setTeamNameValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		event.preventDefault();
		onValidityChanged("teamName", isNotEmpty(teamName));
		if (!teamNameValidity) return;

		setIsLoading(true);
		try {
			await HostApi.instance.send(UpdateTeamRequestType, {
				teamId: derivedState.team.id,
				name: teamName
			});

			HostApi.instance.track("teamName Changed", {});
			dispatch(closeModal());
		} catch (error) {
			logError(`Unexpected error during change teamName: ${error}`, { teamName });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setIsLoading(false);
	};

	const repoName = "your repo"; //FIXME
	return (
		<Dialog title="Team Settings" onClose={() => dispatch(closeModal())}>
			<Form className="standard-form">
				<fieldset className="form-body">
					<div id="controls">
						<h3>Team Name</h3>
						<TextInput
							name="teamName"
							autoFocus
							value={teamName}
							onChange={setTeamName}
							onValidityChanged={onValidityChanged}
							validate={isNotEmpty}
						/>
						<div style={{ height: "20px" }} />
						<h3>Live View</h3>
						<p className="explainer">
							Share local coding changes with teammates
							<Link href="https://docs.codestream.com/userguide/features/team-live-view/">
								<Icon name="info" className="clickable" title="More info" />
							</Link>
						</p>
						<RadioGroup
							name="live-view"
							selectedValue={xraySetting}
							onChange={value => changeXray(value)}
							loading={isLoading}
						>
							<Radio value="on">Always On</Radio>
							<Radio value="off">Always Off</Radio>
							<Radio value="user">User Selectable</Radio>
						</RadioGroup>
						<div style={{ height: "20px" }} />
						<h3>VS Code Recommended Extensions</h3>
						<Checkbox
							name="recommend"
							checked={recommended}
							onChange={() => setRecommended(!recommended)}
						>
							Add CodeStream to <span className="monospace">extensions.json</span>
							<Link href="https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions">
								<Icon name="info" className="clickable" title="More info" />
							</Link>
						</Checkbox>
						<div style={{ height: "20px" }} />
						<h3>
							Pre-Configure <span className="monospace">.codestreamconfig</span>
						</h3>
						<p className="explainer">
							Streamline membership and integration options for your teammates
							<Link href="https://docs.codestream.com/userguide/features/team-live-view/">
								<Icon name="info" className="clickable" title="More info" />
							</Link>
						</p>
						<Checkbox
							name="configure"
							checked={configure}
							onChange={() => setConfigure(!configure)}
						>
							Add people who open {repoName} to <b>{team.name}</b>
						</Checkbox>
						{configure && (
							<>
								<PreConfigure>
									Code Host: <InlineMenu items={codeHostItems}>{codeHostLabel}</InlineMenu>
								</PreConfigure>
								<PreConfigure>
									Messaging: <InlineMenu items={messagingItems}>{messagingLabel}</InlineMenu>
								</PreConfigure>
								<PreConfigure>
									Issues: <InlineMenu items={issueItems}>{issueLabel}</InlineMenu>
								</PreConfigure>
							</>
						)}
					</div>
					<div style={{ height: "10px" }} />
					<ButtonRow>
						<Button variant="secondary" onClick={() => {}}>
							Cancel
						</Button>
						<Button onClick={save}>Save Team Settings</Button>
					</ButtonRow>
				</fieldset>
			</Form>
		</Dialog>
	);
}
