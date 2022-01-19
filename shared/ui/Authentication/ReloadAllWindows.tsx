import React, { PropsWithChildren, useState } from "react";
import { Dialog } from "../src/components/Dialog";
import { Modal } from "../Stream/Modal";
import Button from "../Stream/Button";
import styled from "styled-components";
import { HostApi } from "../webview-api";
import { ReloadWebviewRequestType } from "../ipc/webview.protocol";
import { useDispatch } from "react-redux";
import { updateConfigs } from "../store/configs/actions";
import { UpdateServerUrlRequestType } from "../ipc/host.protocol";

const ReloadButtonWrapper = styled.div`
	margin: 20px 0 0 0;
`;

const ReloadButtonCopy = styled.b`
	font-size: 14px !important;
	padding: 10px;
`;

const SERVER_URL_ON_RELOAD = "https://staging-api.codestream.us";

interface ReloadAllWindowsProps {
	handleClose: Function;
	userId: string | undefined;
	email: string | undefined;
}

export const ReloadAllWindows = (props: PropsWithChildren<ReloadAllWindowsProps>) => {
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);

	const handleClose = event => {
		event.preventDefault();
		props.handleClose(event);
	};

	const handleClick = async event => {
		event.preventDefault();
		setLoading(true);
		dispatch(updateConfigs({ serverUrl: SERVER_URL_ON_RELOAD }));
		await HostApi.instance.send(UpdateServerUrlRequestType, {
			serverUrl: SERVER_URL_ON_RELOAD
		});
		HostApi.instance.send(ReloadWebviewRequestType, void undefined);
	};

	return (
		<Modal translucent>
			<Dialog title="Reload All Windows" onClose={e => handleClose(e)}>
				<div>
					Clicking Continue will reload this IDE window and change you to the staging environment,
					where you'll need to sign up again. If you have other IDE windows open you'll need to
					reload them manually.
				</div>
				<ReloadButtonWrapper>
					<Button
						style={{ width: "100%" }}
						loading={loading}
						onClick={e => handleClick(e)}
						className="control-button"
					>
						<div className="copy">
							<ReloadButtonCopy>Continue</ReloadButtonCopy>
						</div>
					</Button>
				</ReloadButtonWrapper>
			</Dialog>
		</Modal>
	);
};
