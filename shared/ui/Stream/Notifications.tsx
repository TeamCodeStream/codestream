import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { Checkbox } from "../src/components/Checkbox";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import { setUserPreference, closeModal } from "./actions";
import { HostApi } from "../webview-api";
import {
	CSNotificationDeliveryPreference,
	CSNotificationPreference
} from "@codestream/protocols/api";
import Icon from "./Icon";
import { Dialog } from "../src/components/Dialog";
import { Link } from "./Link";

export const Notifications = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const hasDesktopNotifications = state.ide.name === "VSC" || state.ide.name === "JETBRAINS";
		const notificationDeliverySupported = isFeatureEnabled(state, "notificationDeliveryPreference");
		const emailSupported = isFeatureEnabled(state, "emailSupport");

		// disable FROP for new users by default
		const me = state.users[state.session.userId!];
		let createReviewOnDetectUnreviewedCommits;
		if (me.createdAt > 1641405000000) {
			createReviewOnDetectUnreviewedCommits =
				state.preferences.reviewCreateOnDetectUnreviewedCommits === true ? true : false;
		} else {
			createReviewOnDetectUnreviewedCommits =
				state.preferences.reviewCreateOnDetectUnreviewedCommits === false ? false : true;
		}

		return {
			notificationPreference: state.preferences.notifications || CSNotificationPreference.InvolveMe,
			notificationDeliveryPreference:
				state.preferences.notificationDelivery || CSNotificationDeliveryPreference.All,
			reviewReminderDelivery: state.preferences.reviewReminderDelivery === false ? false : true,
			createReviewOnDetectUnreviewedCommits: createReviewOnDetectUnreviewedCommits,
			weeklyEmailDelivery: state.preferences.weeklyEmailDelivery === false ? false : true,
			hasDesktopNotifications,
			notificationDeliverySupported,
			emailSupported
		};
	});
	const [loading, setLoading] = useState(false);
	const [loadingDelivery, setLoadingDelivery] = useState(false);
	const [loadingReminderDelivery, setLoadingReminderDelivery] = useState(false);
	const [
		loadingCreateReviewOnDetectUnreviewedCommits,
		setLoadingCreateReviewOnDetectUnreviewedCommits
	] = useState(false);
	const [loadingWeeklyEmailDelivery, setLoadingWeeklyEmailDelivery] = useState(false);

	const handleChange = async (value: string) => {
		setLoading(true);
		HostApi.instance.track("Notification Preference Changed", { Value: value });
		// @ts-ignore
		await dispatch(setUserPreference(["notifications"], value));
		setLoading(false);
	};

	const handleChangeReviewReminders = async (value: boolean) => {
		setLoadingReminderDelivery(true);
		// @ts-ignore
		await dispatch(setUserPreference(["reviewReminderDelivery"], value));
		setLoadingReminderDelivery(false);
	};

	const handleChangeCreateReviewOnDetectUnreviewedCommits = async (value: boolean) => {
		setLoadingCreateReviewOnDetectUnreviewedCommits(true);
		HostApi.instance.track("Review Create On Detect Unreviewed Commits Changed", { Value: value });
		dispatch(setUserPreference(["reviewCreateOnDetectUnreviewedCommits"], value));
		setLoadingCreateReviewOnDetectUnreviewedCommits(false);
	};

	const handleChangeWeeklyEmailDelivery = async (value: boolean) => {
		setLoadingWeeklyEmailDelivery(true);
		// @ts-ignore
		await dispatch(setUserPreference(["weeklyEmailDelivery"], value));
		setLoadingWeeklyEmailDelivery(false);
	};

	const handleChangeDelivery = async (value: string) => {
		setLoadingDelivery(true);
		HostApi.instance.track("Notification Delivery Preference Changed", { Value: value });
		// @ts-ignore
		await dispatch(setUserPreference(["notificationDelivery"], value));
		setLoadingDelivery(false);
	};

	return (
		<Dialog title="Notification Settings" onClose={() => dispatch(closeModal())}>
			<form className="standard-form vscroll">
				<fieldset className="form-body">
					{!derivedState.emailSupported && (
						<p
							className="color-warning"
							style={{ display: "flex", padding: "10px 0", whiteSpace: "normal" }}
						>
							<Icon name="alert" />
							<div style={{ paddingLeft: "10px" }}>
								Ask your admin to set up outbound email for your on-prem instance of CodeStream.
							</div>
						</p>
					)}
					<p className="explainer">
						{derivedState.hasDesktopNotifications
							? "Follow codemarks and feedback requests to receive desktop and email notifications."
							: "Follow codemarks and feedback requests to receive email notifications."}
					</p>
					<div id="controls">
						<RadioGroup
							name="preference"
							selectedValue={derivedState.notificationPreference}
							onChange={handleChange}
							loading={loading}
						>
							<Radio value="all">
								Automatically follow all new codemarks and feedback requests
							</Radio>
							<Radio value="involveMe">
								Follow codemarks and feedback requests I have created, I have been mentioned in, or
								I have replied to
							</Radio>
							<Radio value="off">
								Don't automatically follow any codemarks or feedback requests
							</Radio>
						</RadioGroup>
						{derivedState.hasDesktopNotifications && derivedState.notificationDeliverySupported && (
							<div style={{ marginTop: "20px" }}>
								<p className="explainer">Deliver notifications via:</p>
								<RadioGroup
									name="delivery"
									selectedValue={derivedState.notificationDeliveryPreference}
									onChange={handleChangeDelivery}
									loading={loadingDelivery}
								>
									<Radio value={CSNotificationDeliveryPreference.All}>Email &amp; Desktop</Radio>
									<Radio value={CSNotificationDeliveryPreference.EmailOnly}>Email only</Radio>
									<Radio value={CSNotificationDeliveryPreference.ToastOnly}>Desktop only</Radio>
									<Radio value={CSNotificationDeliveryPreference.Off}>None</Radio>
								</RadioGroup>
							</div>
						)}
						<h3>Other Notifications</h3>
						<div style={{ marginTop: "20px" }}>
							<Checkbox
								name="frReminders"
								checked={derivedState.reviewReminderDelivery}
								onChange={handleChangeReviewReminders}
								loading={loadingReminderDelivery}
							>
								Send me an email reminder for outstanding feedback requests
							</Checkbox>
						</div>
						<div style={{ marginTop: "20px" }}>
							<Checkbox
								name="createReviewOnDetectUnreviewedCommits"
								checked={derivedState.createReviewOnDetectUnreviewedCommits}
								onChange={handleChangeCreateReviewOnDetectUnreviewedCommits}
								loading={loadingCreateReviewOnDetectUnreviewedCommits}
							>
								Notify me about new unreviewed commits from teammates when I pull
							</Checkbox>
						</div>
						<div style={{ marginTop: "20px" }}>
							<Checkbox
								name="weeklyEmails"
								checked={derivedState.weeklyEmailDelivery}
								onChange={handleChangeWeeklyEmailDelivery}
								loading={loadingWeeklyEmailDelivery}
							>
								Send me weekly emails summarizing my activity
							</Checkbox>
						</div>
						<p>&nbsp;</p>

						<p>
							<Link href="https://docs.newrelic.com/docs/codestream/codestream-integrations/notifications/">
								Learn more about CodeStream Notifications
							</Link>
						</p>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
