import { CSMe } from "@codestream/protocols/api";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { RequestType } from "vscode-jsonrpc";
import { HostApi } from "../webview-api";
import { closeModal } from "./actions";

export const ButtonRow = styled.div`
	text-align: center;
	margin-top: 20px;
	button {
		width: 100%;
	}
`;

export const Tester = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return { currentUsername: currentUser.username };
	});
	const [loading, setLoading] = useState(false);
	const [method, setMethod] = useState("codestream/provider/pullrequest");

	const [payload, setPayload] = useState(
		JSON.stringify(
			{
				providerId: "github*com",
				pullRequestId: "72",
			},
			null,
			4
		)
	);
	const [result, setResult] = useState("");

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();

		setLoading(true);

		const f = new RequestType<any, any, any, any>(method);
		try {
			const r = await HostApi.instance.send(f, JSON.parse(payload));
			setResult(JSON.stringify(r, null, 4));
		} catch (e) {
			setResult(JSON.stringify(e, null, 4));
		}
		setLoading(false);
	};

	return (
		<Dialog title="Tester" onClose={() => dispatch(closeModal())}>
			<form className="standard-form">
				<fieldset className="form-body" style={{ width: "100%", padding: "0px" }}>
					<div id="controls">
						<div className="control-group">
							<input
								type="text"
								style={{ width: "400px" }}
								name="method"
								value={method}
								onChange={event => setMethod(event.target.value)}
							/>
							<br />
							<textarea
								style={{ width: "400px", height: "300px" }}
								name="payload"
								value={payload}
								onChange={event => setPayload(event.target.value)}
							/>
							<br />
							<textarea style={{ width: "400px", height: "600px" }} value={result}></textarea>
						</div>

						<ButtonRow>
							<Button onClick={onSubmit}>Send</Button>
						</ButtonRow>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
