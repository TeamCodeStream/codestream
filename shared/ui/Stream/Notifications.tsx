import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { Checkbox } from "../src/components/Checkbox";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import { setUserPreference, closeModal } from "./actions";
import { HostApi } from "../webview-api";
import {
	CSNotificationDeliveryPreference,
	CSNotificationPreference,
} from "@codestream/protocols/api";
import Icon from "./Icon";
import { Dialog } from "../src/components/Dialog";

export const Notifications = props => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const hasDesktopNotifications = state.ide.name === "VSC" || state.ide.name === "JETBRAINS";
		const notificationDeliverySupported = isFeatureEnabled(state, "notificationDeliveryPreference");
		const emailSupported = isFeatureEnabled(state, "emailSupport");

		return {
			notificationPreference: state.preferences.notifications || CSNotificationPreference.InvolveMe,
			notificationDeliveryPreference:
				state.preferences.notificationDelivery || CSNotificationDeliveryPreference.All,
			notifyPerformanceIssues: state.preferences.notifyPerformanceIssues === false ? false : true,
			weeklyEmailDelivery: state.preferences.weeklyEmailDelivery === false ? false : true,
			hasDesktopNotifications,
			notificationDeliverySupported,
			emailSupported,
		};
	});

	const [loading, setLoading] = useState(false);
	const [loadingDelivery, setLoadingDelivery] = useState(false);
	const [loadingNotifyPerformanceIssues, setLoadingNotifyPerformanceIssues] = useState(false);
	const [loadingWeeklyEmailDelivery, setLoadingWeeklyEmailDelivery] = useState(false);

	const handleChange = async (value: string) => {
		setLoading(true);
		HostApi.instance.track("Notification Preference Changed", { Value: value });
		dispatch(setUserPreference({ prefPath: ["notifications"], value }));
		setLoading(false);
	};

	const handleChangeWeeklyEmailDelivery = async (value: boolean) => {
		setLoadingWeeklyEmailDelivery(true);
		dispatch(setUserPreference({ prefPath: ["weeklyEmailDelivery"], value }));
		setLoadingWeeklyEmailDelivery(false);
	};

	const handleChangeDelivery = async (value: string) => {
		setLoadingDelivery(true);
		HostApi.instance.track("Notification Delivery Preference Changed", { Value: value });
		dispatch(setUserPreference({ prefPath: ["notificationDelivery"], value }));
		setLoadingDelivery(false);
	};

	const handleChangeNotifyPerformanceIssues = async (value: boolean) => {
		setLoadingNotifyPerformanceIssues(true);
		HostApi.instance.track("Notify Performance Issues Changed", { Value: value });
		dispatch(setUserPreference({ prefPath: ["notifyPerformanceIssues"], value }));
		setLoadingNotifyPerformanceIssues(false);
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
							? "Follow discussions to receive desktop and email notifications."
							: "Follow discussions to receive email notifications."}
					</p>
					<div id="controls">
						<RadioGroup
							name="preference"
							selectedValue={derivedState.notificationPreference}
							onChange={handleChange}
							loading={loading}
						>
							<Radio value="all">Automatically follow all new discussions</Radio>
							<Radio value="involveMe">
								Follow discussions I have created, I have been mentioned in, or I have replied to
							</Radio>
							<Radio value="off">Don't automatically follow any discussions</Radio>
						</RadioGroup>
						{derivedState.hasDesktopNotifications && derivedState.notificationDeliverySupported && (
							<div style={{ marginTop: "20px" }}>
								<p className="explainer">Deliver notifications via:</p>
								<RadioGroup
									name="delivery"
									data-test-id="deliveryRadioGroup"
									selectedValue={derivedState.notificationDeliveryPreference}
									onChange={handleChangeDelivery}
									loading={loadingDelivery}
								>
									<Radio data-testid="delivery-all" value={CSNotificationDeliveryPreference.All}>
										Email &amp; Desktop
									</Radio>
									<Radio
										data-testid="delivery-email"
										value={CSNotificationDeliveryPreference.EmailOnly}
									>
										Email only
									</Radio>
									<Radio
										data-testid="delivery-desktop"
										value={CSNotificationDeliveryPreference.ToastOnly}
									>
										Desktop only
									</Radio>
									<Radio data-testid="delivery-none" value={CSNotificationDeliveryPreference.Off}>
										None
									</Radio>
								</RadioGroup>
							</div>
						)}
						<h3>Email Notifications</h3>
						{
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
						}
						{derivedState.hasDesktopNotifications && derivedState.notificationDeliverySupported && (
							<div>
								<h3>Desktop Notifications</h3>
								<div style={{ marginTop: "20px" }}>
									<Checkbox
										name="notifyPerformanceIssues"
										checked={derivedState.notifyPerformanceIssues}
										onChange={handleChangeNotifyPerformanceIssues}
										loading={loadingNotifyPerformanceIssues}
									>
										Notify me about performance issues
									</Checkbox>
								</div>
							</div>
						)}
						<p>&nbsp;</p>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
