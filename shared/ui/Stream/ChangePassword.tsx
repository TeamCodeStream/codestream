import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";
import { ButtonRow } from "./ChangeUsername";

export const ChangePassword = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {};
	});
	const [loading, setLoading] = useState(false);
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword1, setNewPassword1] = useState("");
	const [newPassword2, setNewPassword2] = useState("");

	const savePassword = async () => {
		setLoading(true);
		// HostApi.instance.track("Password Changed", {});
		// @ts-ignore
		// const result = await dispatch(setUserPassword(oldPassword, newPassword2));
		setLoading(false);
	};

	return (
		<Dialog title="Change Password" onClose={() => dispatch(closeModal())}>
			<form className="standard-form">
				<fieldset className="form-body" style={{ width: "18em" }}>
					<div id="controls">
						<input
							name="old-password"
							value={oldPassword}
							className="input-text control"
							autoFocus
							type="text"
							onChange={e => setOldPassword(e.target.value)}
							placeholder="Enter your old password"
						/>
						<input
							name="new-password1"
							value={newPassword1}
							className="input-text control"
							type="text"
							onChange={e => setNewPassword1(e.target.value)}
							placeholder="Enter your new password"
						/>
						<input
							name="new-password2"
							value={newPassword2}
							className="input-text control"
							type="text"
							onChange={e => setNewPassword2(e.target.value)}
							placeholder="Retype your new password"
						/>
						<ButtonRow>
							<Button onClick={savePassword} isLoading={loading}>
								Save Password
							</Button>
						</ButtonRow>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
