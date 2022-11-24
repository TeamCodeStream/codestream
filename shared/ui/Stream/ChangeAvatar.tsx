import { UpdateUserRequestType } from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import React, { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import { TextInput } from "../Authentication/TextInput";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { Headshot } from "../src/components/Headshot";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import { closeModal } from "./actions";
import { ButtonRow } from "./ChangeUsername";
import { Link } from "./Link";

// profile images can either be blank, in which case we'll fall back to
// gravatar, and then initials if no gravatar, or they can be a URL
const isValidImage = s => s.length === 0 || s.toLocaleLowerCase().startsWith("http");

export const ChangeAvatar = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return { currentUser, currentAvatar: currentUser.avatar ? currentUser.avatar.image : "" };
	});
	const [loading, setLoading] = useState(false);
	const [avatar, setAvatar] = useState(derivedState.currentAvatar || "");
	const [avatarValidity, setAvatarValidity] = useState(true);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "avatar":
				setAvatarValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent, clear?: boolean) => {
		setUnexpectedError(false);
		event.preventDefault();
		if (!clear) {
			onValidityChanged("avatar", isValidImage(avatar));
			if (!avatarValidity) return;
		}

		setLoading(true);
		const image = clear ? "" : avatar;
		try {
			await HostApi.instance.send(UpdateUserRequestType, { avatar: { image } });
			HostApi.instance.track("Avatar Change Request", {});
			dispatch(closeModal());
		} catch (error) {
			logError(error, { detail: `Unexpected error during change avatar`, image });
			setUnexpectedError(true);
		}
		// @ts-ignore
		setLoading(false);
	};

	return (
		<Dialog title="Change Profile Photo" onClose={() => dispatch(closeModal())}>
			<form className="standard-form" style={{ maxWidth: "18em" }}>
				<fieldset className="form-body">
					<p>
						<div style={{ float: "right", paddingLeft: "10px" }}>
							<Headshot size={50} display="inline-block" person={derivedState.currentUser} />
						</div>
						CodeStream can grab your profile photo from{" "}
						<a href="https://gravatar.com">gravatar.com</a>.
					</p>
					<p>Or, set it here by using an existing image.</p>

					<div id="controls">
						{unexpectedError && (
							<div className="error-message form-error">
								<FormattedMessage
									id="error.unexpected"
									defaultMessage="Something went wrong! Please try again, or "
								/>
								<FormattedMessage id="contactSupport" defaultMessage="contact support">
									{text => <Link href="https://docs.newrelic.com/docs/codestream/">{text}</Link>}
								</FormattedMessage>
								.
							</div>
						)}
						<div className="control-group">
							<label>Photo URL</label>
							<TextInput
								name="avatar"
								value={avatar}
								autoFocus
								onChange={setAvatar}
								onValidityChanged={onValidityChanged}
								validate={isValidImage}
							/>
							{!avatarValidity && <small className="explainer error-message">Blank or URL</small>}
							<ButtonRow>
								<Button onClick={onSubmit} isLoading={loading}>
									Save Profile Photo
								</Button>
							</ButtonRow>
							<div
								style={{
									margin: "20px -20px 0 -20px",
									height: "1px",
									background: "var(--base-border-color)",
								}}
							></div>
							<ButtonRow>
								<Button onClick={e => onSubmit(e, true)} isLoading={loading} variant="secondary">
									Use Gravatar
								</Button>
							</ButtonRow>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
