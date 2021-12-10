import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { CSMe } from "@codestream/protocols/api";
import { Dialog } from "../src/components/Dialog";
import { GetUserInfoRequestType, AddBlameMapRequestType } from "@codestream/protocols/agent";
import { Modal } from "./Modal";
import { useDidMount } from "../utilities/hooks";
import { setUserPreference } from "./actions";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

// TODO: This file is depreciated - keeping for now in case we decide
// 		 to add back in this dialog later, but its a candidate for deletion
export const ButtonRow = styled.div`
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

export const CheckEmailVsGit = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const blameMap = team.settings ? team.settings.blameMap : {};
		const skipGitEmailCheck = state.preferences.skipGitEmailCheck;
		const addBlameMapEnabled = isFeatureEnabled(state, "addBlameMap");
		return { currentUser, blameMap, team, skipGitEmailCheck, addBlameMapEnabled };
	});

	const [loading, setLoading] = useState(false);
	const [scmEmail, setScmEmail] = useState("");

	const { team, currentUser, skipGitEmailCheck, addBlameMapEnabled, blameMap = {} } = derivedState;

	const mappedMe = blameMap[scmEmail.replace(/\./g, "*")];

	useDidMount(() => {
		// if my email address has already been mapped,
		// or if I've already been through this, don't
		// do the async user load and we'll just return null
		if (mappedMe || skipGitEmailCheck) return;
		else getUserInfo();
	});

	const close = () => {
		dispatch(setUserPreference(["skipGitEmailCheck"], true));
	};

	const getUserInfo = async () => {
		const response = await HostApi.instance.send(GetUserInfoRequestType, {});
		if (response.email === currentUser.email) {
			dispatch(setUserPreference(["skipGitEmailCheck"], true));
		} else {
			setScmEmail(response.email || "");
		}
	};

	const clickNo = () => {
		HostApi.instance.track("Git Email Mismatch", { Mapped: false });
		close();
	};

	const clickYes = () => {
		addBlameMap(scmEmail, currentUser.id);
		HostApi.instance.track("Git Email Mismatch", { Mapped: true });
		close();
	};

	const addBlameMap = async (email: string, userId: string) => {
		setLoading(true);
		await HostApi.instance.send(AddBlameMapRequestType, {
			teamId: team.id,
			userId,
			email
		});
		setLoading(false);
	};

	// console.warn("A: ", addBlameMapEnabled, " : ", scmEmail);
	if (addBlameMapEnabled && scmEmail && !mappedMe && !skipGitEmailCheck)
		return (
			<Modal translucent>
				<Dialog title="Git Email Check" onClose={close}>
					<p style={{ wordBreak: "break-word" }}>
						You are signed in as <b className="highlight">{currentUser.email}</b>
					</p>
					<p style={{ wordBreak: "break-word" }}>
						Is <b className="highlight">{scmEmail}</b> also you?
					</p>
					<ButtonRow>
						<Button variant="secondary" onClick={clickNo} tabIndex={0}>
							Nope, not me
						</Button>
						<Button onClick={clickYes} isLoading={loading} tabIndex={0}>
							Yes, that's me
						</Button>
					</ButtonRow>
				</Dialog>
			</Modal>
		);
	else return null;
};
