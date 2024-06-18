import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { Checkbox } from "../src/components/Checkbox";
import { setUserPreference, closeModal } from "./actions";
import { Dialog } from "../src/components/Dialog";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import Icon from "./Icon";

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
		// dispatch(setUserPreference({ prefPath: ["serviceNotifyType"], value }));
	};

	const handleChangeServiceNotifyStringName = async (value: string) => {
		setServiceNotifyStringName(value);
		// dispatch(setUserPreference({ prefPath: ["serviceNotifyType"], value }));
	};

	const handleChangeServiceNotifyAccountId = async (value: string) => {
		setServiceNotifyAccountId(value);
		// dispatch(setUserPreference({ prefPath: ["serviceNotifyType"], value }));
	};

	return (
		<Dialog wide={true} title="Notification Settings" onClose={() => dispatch(closeModal())}>
			<form className="standard-form vscroll">
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
										Notify me about services with performance problems
									</Checkbox>
									<div style={{ marginLeft: "25px" }} className="subtle">
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
														<Icon className="clickable" name="x" />
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
													<input
														className="input-text control"
														value={serviceNotifyTagValue}
														onChange={event =>
															handleChangeServiceNotifyTagValue(event.target.value)
														}
														placeholder="enviornment: production, enviornment: eu-production"
													/>
												</div>
											)}
											<Radio value={"STRINGNAME"}>
												All services with the following string in the name
											</Radio>
											{derivedState.serviceNotifyType === "STRINGNAME" && (
												<div style={{ marginBottom: "12px" }}>
													<input
														className="input-text control"
														value={serviceNotifyStringName}
														onChange={event =>
															handleChangeServiceNotifyStringName(event.target.value)
														}
														placeholder="(Prod)"
													/>
												</div>
											)}
											<Radio value={"ACCOUNTID"}>All services in the following account IDs</Radio>
											{derivedState.serviceNotifyType === "ACCOUNTID" && (
												<div style={{ marginBottom: "12x" }}>
													<input
														className="input-text control"
														value={serviceNotifyAccountId}
														onChange={event =>
															handleChangeServiceNotifyAccountId(event.target.value)
														}
														placeholder="1606862, 1693888"
													/>
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
