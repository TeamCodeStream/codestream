import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useEffect, useRef, useState } from "react";
import { CodeStreamState } from "../store";
import { Checkbox } from "../src/components/Checkbox";
import { setUserPreference, closeModal } from "./actions";
import { Dialog } from "../src/components/Dialog";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import Icon from "./Icon";
import { TextInput } from "../Authentication/TextInput";
import cx from "classnames";
import { isEmpty as _isEmpty } from "lodash";
import { HostApi } from "../webview-api";
import { useDidMount } from "../utilities/hooks";
import styled from "styled-components";

const NotficationSubHeaders = styled.div`
	text-transform: uppercase;
	font-weight: 800;
	opacity: 0.7;
	color: var(--text-color-subtle);
	font-size: 11px;
	margin-bottom: 8px;
`;

export const Notifications = props => {
	const dispatch = useAppDispatch();
	const elementRef = useRef<HTMLFormElement>(null);
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const hasDesktopNotifications = state.ide.name === "VSC" || state.ide.name === "JETBRAINS";
		return {
			notifyPerformanceIssues: state.preferences.notifyPerformanceIssues === false ? false : true,
			repoFollowingType: state.preferences.repoFollowingType
				? state.preferences.repoFollowingType
				: "AUTO",
			serviceNotifyType: state.preferences.serviceNotifyType
				? state.preferences.serviceNotifyType
				: "all",
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
			followedRepos: state.preferences?.followedRepos || [],
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
	const [originalRepoFollowingType, setOriginalRepoFollowingType] = useState(
		derivedState.repoFollowingType
	);
	const [originalServiceNotificationType, setOriginalServiceNotificationType] = useState(
		derivedState.serviceNotifyType
	);
	const [formWidth, setFormWidth] = useState(0);

	useDidMount(() => {
		setOriginalRepoFollowingType(derivedState.repoFollowingType);
		setOriginalServiceNotificationType(derivedState.serviceNotifyType);
		setTagValueValidity(isTagValueValid(derivedState.serviceNotifyTagValue));
		setStringValidity(!_isEmpty(derivedState.serviceNotifyStringName));
		setAccountIdValidity(isAccountIdValid(derivedState.serviceNotifyAccountId));
	});

	useEffect(() => {
		const handleResize = () => {
			if (elementRef.current) {
				const elementWidth = elementRef.current?.offsetWidth;
				setFormWidth(elementWidth);
			}
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [elementRef]);

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
			dispatch(setUserPreference({ prefPath: ["serviceNotifyTagValue"], value }));
		} else {
			setTagValueValidity(false);
		}
	};

	const handleChangeServiceNotifyStringName = async (value: string) => {
		setServiceNotifyStringName(value);
		if (!_isEmpty(value)) {
			setStringValidity(true);
			dispatch(setUserPreference({ prefPath: ["serviceNotifyStringName"], value }));
		} else {
			setStringValidity(false);
		}
	};

	const handleChangeServiceNotifyAccountId = async (value: string) => {
		setServiceNotifyAccountId(value);
		if (isAccountIdValid(value)) {
			setAccountIdValidity(true);
			dispatch(setUserPreference({ prefPath: ["serviceNotifyAccountId"], value }));
		} else {
			setAccountIdValidity(false);
		}
	};

	const handleUnfollowRepoClick = (repoObject: { guid: string; name: string }) => {
		const { guid } = repoObject;
		const isFollowed = derivedState.followedRepos.some(repo => repo.guid === guid);
		if (isFollowed) {
			const newFollowedRepos = derivedState.followedRepos.filter(repo => repo.guid !== guid);
			dispatch(setUserPreference({ prefPath: ["followedRepos"], value: newFollowedRepos }));
		}
	};

	const handleSubmit = event => {
		event.preventDefault();
	};

	const handleClose = e => {
		e.preventDefault();

		if (originalRepoFollowingType !== derivedState.repoFollowingType) {
			HostApi.instance.track("codestream/notifications/repo_following_option changed", {
				meta_data: `old_value: ${originalRepoFollowingType.toLowerCase()}; new_value: ${derivedState.repoFollowingType.toLowerCase()}`,
				event_type: "change",
			});
		}
		if (originalServiceNotificationType !== derivedState.serviceNotifyType) {
			HostApi.instance.track("codestream/notifications/service_notification_option changed", {
				meta_data: `old_value: ${originalServiceNotificationType}; new_value: ${derivedState.serviceNotifyType}`,
				event_type: "change",
			});
		}

		dispatch(closeModal());
	};

	return (
		<Dialog wide={true} title="Notification Settings" onClose={e => handleClose(e)}>
			<form ref={elementRef} onSubmit={handleSubmit} className="standard-form vscroll">
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
									<div style={{ marginLeft: "30px", fontSize: "smaller" }} className="subtle">
										CodeStream will email you about services associated with the selected
										repositories that are exhibiting performance problems.
									</div>
								</div>
								{derivedState.notifyPerformanceIssues && (
									<>
										<NotficationSubHeaders>REPOSITORIES YOU ARE FOLLOWING</NotficationSubHeaders>
										<RadioGroup
											name="repo-following-type"
											selectedValue={derivedState.repoFollowingType}
											onChange={value => handleChangeRepoFollowingType(value)}
										>
											<Radio value={"AUTO"}>Automatically follow any repository that I open</Radio>
											<Radio value={"MANUAL"}>
												Manually follow repositories
												<div style={{ fontSize: "smaller" }} className="subtle">
													Hover over a repository's name in the CodeStream tree view and click on
													the Follow icon.
												</div>
											</Radio>
										</RadioGroup>
										<div style={{ marginTop: "6px" }}>
											{derivedState.followedRepos.map((_, index, array) => {
												return (
													<div
														style={{
															display: "flex",
															marginBottom: index !== array.length - 1 ? "4px" : "0px",
														}}
													>
														<div>
															<Icon style={{ marginRight: "2px" }} name="repo" />
														</div>

														<div
															style={{
																padding: "0px 25px 0px 10px",
																wordWrap: "break-word",
																width: `${formWidth - 45}px`,
															}}
														>
															{_.name}
														</div>
														<div style={{ marginRight: "auto" }}>
															{derivedState.repoFollowingType === "MANUAL" && (
																<Icon
																	style={{ marginRight: "4px" }}
																	className="clickable"
																	name="x"
																	onClick={e => handleUnfollowRepoClick(_)}
																/>
															)}
														</div>
													</div>
												);
											})}
										</div>
										<NotficationSubHeaders style={{ margin: "15px 0px 8px 0px" }}>
											SERVICES YOU WILL BE NOTIFIED ABOUT
										</NotficationSubHeaders>
										<RadioGroup
											name="service-notify-type"
											selectedValue={derivedState.serviceNotifyType}
											onChange={value => handleChangeServiceNotifyType(value)}
										>
											<Radio value={"all"}>All services for each repository</Radio>
											<Radio value={"tag"}>All services with the following tag:value pairs</Radio>
											{derivedState.serviceNotifyType === "tag" && (
												<div style={{ paddingLeft: "28px", marginBottom: "12x" }}>
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
											<Radio value={"string"}>
												All services with the following string in the name
											</Radio>
											{derivedState.serviceNotifyType === "string" && (
												<div style={{ paddingLeft: "28px", marginBottom: "12x" }}>
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
											<Radio value={"account"}>All services in the following account IDs</Radio>
											{derivedState.serviceNotifyType === "account" && (
												<div style={{ paddingLeft: "28px", marginBottom: "12x" }}>
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
