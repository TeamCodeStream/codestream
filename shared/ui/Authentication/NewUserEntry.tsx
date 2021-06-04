import React from "react";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { connect } from "react-redux";
import { CodeStreamState } from "../store";
import { goToLogin, goToJoinTeam, goToSignup } from "../store/context/actions";
import { DispatchProp } from "../store/common";
import { HostApi, Server } from "../webview-api";
import { SignupType } from "./actions";
import { JoinTeam } from "./JoinTeam";
import { useDidMount } from "../utilities/hooks";
import { CSRepository, CSTeam, CSUser } from "../protocols/agent/api.protocol.models";
import { SmartFormattedList } from "../Stream/SmartFormattedList";
import { Headshot } from "../src/components/Headshot";
import styled from "styled-components";
import { Link } from "../Stream/Link";
import { Loading } from "../Container/Loading";
import {
	GetWorkspaceAutoJoinInfoRequestType,
	GetWorkspaceAutoJoinInfoResponse
} from "@codestream/protocols/agent";
import { PresentTOS } from "./PresentTOS";

const JoinTitle = styled.div`
	font-size: 14px;
	display: flex;
	alignitems: center;
	margin-bottom: 20px;
	${Headshot} {
		margin-right: 10px;
		flex-shrink: 0;
	}
	b {
		color: var(--text-color-highlight);
	}
`;

interface ConnectedProps {
	pluginVersion: string;
	whichServer: string;
	isOnPrem: boolean;
	acceptedTOS: boolean;
}

interface Props extends ConnectedProps, DispatchProp {}

const mapStateToProps = (state: CodeStreamState) => {
	const { serverUrl, isOnPrem, environment, isProductionCloud } = state.configs;
	let whichServer = isOnPrem ? serverUrl : "CodeStream's cloud service";
	if (!isProductionCloud) {
		whichServer += ` (${environment.toUpperCase()})`;
	}
	return { pluginVersion: state.pluginVersion, whichServer, isOnPrem };
};

export const NewUserEntry = (connect(mapStateToProps) as any)((props: Props) => {
	const [isInitializing, setIsInitializing] = React.useState(true);
	const [autoJoinInfo, setAutoJoinInfo] = React.useState<GetWorkspaceAutoJoinInfoResponse[]>([]);
	const [repoNamesByTeam, setRepoNamesByTeam] = React.useState<{ [id: string]: string[] }>({});
	const [showAdvanced, setShowAdvanced] = React.useState(false);

	const getAutoJoinInfo = async () => {
		try {
			const response = await HostApi.instance.send(GetWorkspaceAutoJoinInfoRequestType, {});
			if (response) {
				// massage the info to a more collapsed format
				const infoByTeam: { [id: string]: GetWorkspaceAutoJoinInfoResponse } = {};
				const repoNames: { [id: string]: string[] } = {};
				response.forEach(match => {
					const teamId = match.team.id;
					if (infoByTeam[teamId]) return;
					else infoByTeam[teamId] = match;

					repoNames[teamId] = response.filter(m => m.team.id === teamId).map(m => m.repo.name);
				});
				setRepoNamesByTeam(repoNames);
				setAutoJoinInfo(Object.values(infoByTeam));
			}
		} catch (e) {
			console.error("Got an error: ", e);
		}
		setIsInitializing(false);
	};

	useDidMount(() => {
		setIsInitializing(true);
		getAutoJoinInfo();
	});

	const onClickCreateTeam = (event: React.SyntheticEvent) => {
		event.preventDefault();
		HostApi.instance.track("Reg Path Selected", {
			"Reg Path": "Create Team"
		});
		props.dispatch(goToSignup({ type: SignupType.CreateTeam }));
	};

	// const onClickJoinTeam = (event: React.SyntheticEvent) => {
	// 	event.preventDefault();
	// 	HostApi.instance.track("Reg Path Selected", {
	// 		"Reg Path": "Join Team"
	// 	});
	// 	props.dispatch(goToJoinTeam());
	// };

	const onClickAutoJoinTeam = (event: React.SyntheticEvent, teamId: string) => {
		event.preventDefault();
		HostApi.instance.track("Reg Path Selected", {
			"Reg Path": "Auto Join Team"
		});
		const info = autoJoinInfo.find(info => info.team.id === teamId);
		if (info) {
			const repoId = info.repo.id;
			// @ts-ignore
			const commitHash = info.repo.knownCommitHashes[0];
			props.dispatch(goToSignup({ teamId, repoId, commitHash }));
		} else {
			props.dispatch(goToSignup());
		}
	};

	const onClickLogin = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToLogin());
	};

	if (isInitializing) return <Loading />;

	return (
		<div className="onboarding-page">
			<form className="standard-form">
				<fieldset className="form-body">
					{autoJoinInfo.length > 0 &&
						autoJoinInfo.map(match => {
							return (
								<div className="border-bottom-box">
									<JoinTitle>
										{match.admins.map(admin => (
											<Headshot size={40} person={admin} />
										))}
										<div>
											<SmartFormattedList
												value={match.admins.map(admin => (
													<b>{admin.fullName}</b>
												))}
											/>{" "}
											set up a team for people working on the{" "}
											<SmartFormattedList
												value={repoNamesByTeam[match.team.id].map(name => (
													<b>{name}</b>
												))}
											/>{" "}
											{repoNamesByTeam[match.team.id].length > 1 ? "repositories" : "repository"}.
										</div>
									</JoinTitle>
									<Button
										className="row-button no-top-margin"
										onClick={e => onClickAutoJoinTeam(e, match.team.id)}
									>
										<Icon name="plus" />
										<div className="copy">Join {match.team.name}</div>
									</Button>
									<div style={{ textAlign: "right", margin: "10px 0 0 10px", fontSize: "smaller" }}>
										<Link onClick={() => setShowAdvanced(!showAdvanced)}>
											Sign In &amp; Advanced Options
										</Link>
									</div>
								</div>
							);
						})}

					{(autoJoinInfo.length === 0 || showAdvanced) && (
						<>
							<div className="border-bottom-box">
								<h3>Try CodeStream with your team, for free</h3>
								<p>Create a brand-new team for you and your teammates.</p>
								<Button className="row-button no-top-margin" onClick={onClickCreateTeam}>
									<Icon name="plus" />
									<div className="copy">Sign Up and Create a Team</div>
								</Button>
							</div>
							<JoinTeam />
							<div className="border-bottom-box">
								<h3>Already have an account?</h3>
								<Button className="row-button no-top-margin" onClick={onClickLogin}>
									<Icon name="sign-in" />
									<div className="copy">Sign In</div>
								</Button>
							</div>
							<div className="border-bottom-box">
								<h3>
									<Icon name="light-bulb" /> &nbsp;What’s a CodeStream team?
								</h3>
								<p>
									Each organization that uses CodeStream has teams of their own. Teams are where all
									of their code discussions are kept, and they can only be joined by invitation.
								</p>
							</div>
							<div id="controls">
								<div className="footer">
									<div>
										<p style={{ opacity: 0.5, fontSize: ".9em", textAlign: "center" }}>
											CodeStream Version {props.pluginVersion}
											<br />
											Connected to {props.whichServer}.
										</p>
									</div>
								</div>
							</div>
						</>
					)}
				</fieldset>
			</form>
		</div>
	);
});
