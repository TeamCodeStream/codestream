import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { Checkbox } from "../src/components/Checkbox";
import { setUserPreference, closeModal } from "./actions";
import { Dialog } from "../src/components/Dialog";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import Icon from "./Icon";
import { TextInput } from "../Authentication/TextInput";
import cx from "classnames";
import { isEmpty as _isEmpty } from "lodash";

export const Notifications = props => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const hasDesktopNotifications = state.ide.name === "VSC" || state.ide.name === "JETBRAINS";
		return {
			notifyPerformanceIssues: state.preferences.notifyPerformanceIssues === false ? false : true,
			repoFollowingType: state.preferences.repoFollowingType
				? state.preferences.repoFollowingType
				: "AUTO",
			serviceNotifyType: state.preferences.serviceNotifyType
				? state.preferences.serviceNotifyType
				: "REPO",
			serviceNotifyTagValue: state.preferences.serviceNotifyTagValue
				? state.preferences.serviceNotifyTagValue
				: "",
			serviceNotifyStringName: state.preferences.serviceNotifyStringName
				? state.preferences.serviceNotifyStringName
				: "",
			serviceNotifyAccountId: state.preferences.serviceNotifyAccountId
				? state.preferences.serviceNotifyAccountId
				: "",
			hasDesktopNotifications,
		};
	});

	const [serviceNotifyTagValue, setServiceNotifyTagValue] = useState(
		derivedState.serviceNotifyTagValue
	);
	const [serviceNotifyStringName, setServiceNotifyStringName] = useState(
		derivedState.serviceNotifyStringName
	);
	const [serviceNotifyAccountId, setServiceNotifyAccountId] = useState(
		derivedState.serviceNotifyAccountId
	);
	const [tagValueValidity, setTagValueValidity] = useState(false);
	const [stringValidity, setStringValidity] = useState(false);
	const [accountIdValidity, setAccountIdValidity] = useState(false);

	const isTagValueValid = (tagValue: string) =>
		new RegExp("^\\s*\\w+\\s*:\\s*\\w+\\s*(,\\s*\\w+\\s*:\\s*\\w+\\s*)*$").test(tagValue);

	const isAccountIdValid = (accountId: string) =>
		new RegExp("^(\\d+\\s*,\\s*)*\\d+$").test(accountId);

	const handleChangeNotifyPerformanceIssues = async (value: boolean) => {
		dispatch(setUserPreference({ prefPath: ["notifyPerformanceIssues"], value }));
	};

	const handleChangeRepoFollowingType = async (value: string) => {
		dispatch(setUserPreference({ prefPath: ["repoFollowingType"], value }));
	};

	const handleChangeServiceNotifyType = async (value: string) => {
		dispatch(setUserPreference({ prefPath: ["serviceNotifyType"], value }));
	};

	const handleChangeServiceNotifyTagValue = async (value: string) => {
		setServiceNotifyTagValue(value);
		if (isTagValueValid(value)) {
			setTagValueValidity(true);
			// dispatch(setUserPreference({ prefPath: ["serviceNotifyTagValue"], value }));
		} else {
			setTagValueValidity(false);
		}
	};

	const handleChangeServiceNotifyStringName = async (value: string) => {
		setServiceNotifyStringName(value);
		if (!_isEmpty(value)) {
			setStringValidity(true);
			// dispatch(setUserPreference({ prefPath: ["serviceNotifyStringName"], value }));
		} else {
			setStringValidity(false);
		}
	};

	const handleChangeServiceNotifyAccountId = async (value: string) => {
		setServiceNotifyAccountId(value);
		if (isAccountIdValid(value)) {
			setAccountIdValidity(true);
			// dispatch(setUserPreference({ prefPath: ["serviceNotifyAccountId"], value }));
		} else {
			setAccountIdValidity(false);
		}
	};

	const handleSubmit = event => {
		event.preventDefault();
	};

	return (
		<Dialog wide={true} title="Notification Settings" onClose={() => dispatch(closeModal())}>
			<form onSubmit={handleSubmit} className="standard-form vscroll">
				<fieldset className="form-body">
					<div id="controls">
						{derivedState.hasDesktopNotifications && (
							<div>
								<div style={{ margin: "20px 0px 15px 0px" }}>
									<Checkbox
										name="notifyPerformanceIssues"
										checked={derivedState.notifyPerformanceIssues}
										onChange={handleChangeNotifyPerformanceIssues}
									>
										<div style={{ marginLeft: "5px" }}>
											Notify me about services with performance problems
										</div>
									</Checkbox>
									<div style={{ marginLeft: "30px" }} className="subtle">
										CodeStream will email you about services associated with the selected
										repositories that are exhibiting performance problems.
									</div>
								</div>
								{derivedState.notifyPerformanceIssues && (
									<>
										<div style={{ fontSize: "larger", marginBottom: "10px" }} className="subtle">
											REPOSITORIES YOU ARE FOLLOWING
										</div>
										<RadioGroup
											name="repo-following-type"
											selectedValue={derivedState.repoFollowingType}
											onChange={value => handleChangeRepoFollowingType(value)}
										>
											<Radio value={"AUTO"}>Automatically follow any repository that I open</Radio>
											<Radio value={"MANUAL"}>
												Manually follow repositories
												<div className="subtle">
													Hover over a repository's name in the CodeStream tree view and click on
													the Follow icon.
												</div>
											</Radio>
										</RadioGroup>
										{derivedState.repoFollowingType === "MANUAL" && (
											<>
												{/* @TODO: map through repos here */}
												<div style={{ display: "flex", justifyContent: "space-between" }}>
													<div>
														<Icon name="repo" /> Repo Foo
													</div>
													<div>
														<Icon style={{ marginRight: "4px" }} className="clickable" name="x" />
													</div>
												</div>
											</>
										)}
										<div
											style={{ fontSize: "larger", margin: "15px 0px 10px 0px" }}
											className="subtle"
										>
											SERVICES YOU WILL BE NOTIFIED ABOUT
										</div>
										<RadioGroup
											name="service-notify-type"
											selectedValue={derivedState.serviceNotifyType}
											onChange={value => handleChangeServiceNotifyType(value)}
										>
											<Radio value={"REPO"}>All services for each repository</Radio>
											<Radio value={"TAGVALUE"}>
												All services with the following tag:value pairs
											</Radio>
											{derivedState.serviceNotifyType === "TAGVALUE" && (
												<div style={{ marginBottom: "12px" }}>
													<TextInput
														name="tagvalue"
														autoFocus
														value={serviceNotifyTagValue}
														onChange={handleChangeServiceNotifyTagValue}
														placeholder="enviornment: production, enviornment: eu-production"
													/>
													<small
														style={{ paddingLeft: "4px", position: "relative" }}
														className={cx("explainer", { "error-message": !tagValueValidity })}
													>
														Must be a tag value pattern (foo:bar, enviornment:production)
													</small>
												</div>
											)}
											<Radio value={"STRINGNAME"}>
												All services with the following string in the name
											</Radio>
											{derivedState.serviceNotifyType === "STRINGNAME" && (
												<div style={{ marginBottom: "12px" }}>
													<TextInput
														name="stringname"
														autoFocus
														value={serviceNotifyStringName}
														onChange={handleChangeServiceNotifyStringName}
														placeholder="(Prod)"
													/>
													<small
														style={{ paddingLeft: "4px", position: "relative" }}
														className={cx("explainer", { "error-message": !stringValidity })}
													>
														Must enter a value
													</small>
												</div>
											)}
											<Radio value={"ACCOUNTID"}>All services in the following account IDs</Radio>
											{derivedState.serviceNotifyType === "ACCOUNTID" && (
												<div style={{ marginBottom: "12x" }}>
													<TextInput
														name="accountid"
														autoFocus
														value={serviceNotifyAccountId}
														onChange={handleChangeServiceNotifyAccountId}
														placeholder="1606862, 1693888"
													/>
													<small
														style={{ paddingLeft: "4px", position: "relative" }}
														className={cx("explainer", { "error-message": !accountIdValidity })}
													>
														Must be a number, can be seperated by commas (1606862, 1693888)
													</small>
												</div>
											)}
										</RadioGroup>
									</>
								)}
							</div>
						)}
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
