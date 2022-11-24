import {
	CreateNewRelicConfigFileRequestType,
	CreateNewRelicConfigFileResponse,
	InstallNewRelicRequestType,
	InstallNewRelicResponse,
	NewRelicOptions,
	RepoProjectType,
} from "@codestream/protocols/agent";
import * as path from "path-browserify";
import React, { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Range } from "vscode-languageserver-types";

import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { clearProcessBuffer } from "@codestream/webview/store/editorContext/actions";
import { EditorRevealRangeRequestType } from "@codestream/protocols/webview";
import { TextInput } from "../../Authentication/TextInput";
import { logError } from "../../logger";
import { Button } from "../../src/components/Button";
import { Dialog } from "../../src/components/Dialog";
import { CodeStreamState } from "../../store";
import { HostApi } from "../../webview-api";
import { closeModal } from "../actions";
import Icon from "../Icon";
import { Link } from "../Link";
import { SkipLink, Step } from "../Onboard";
import { InstallRow, StepNumber } from "../OnboardNewRelic";

export const AddAppMonitoringDotNetCore = (props: {
	className: string;
	skip: Function;
	newRelicOptions: NewRelicOptions;
}) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { repoId, path } = state.context.wantNewRelicOptions ?? {};
		const repo = repoId ? state.repos[repoId] : undefined;

		return { repo, repoPath: path, bufferText: state.editorContext.buffer?.text };
	});

	const [cwd, setCwd] = useState(
		props.newRelicOptions && props.newRelicOptions.projects && props.newRelicOptions.projects.length
			? props.newRelicOptions.projects[0].path
			: derivedState.repoPath
	);
	const [appName, setAppName] = useState("");
	const [licenseKey, setLicenseKey] = useState("");
	const [installingLibrary, setInstallingLibrary] = useState(false);
	const [creatingConfig, setCreatingConfig] = useState(false);
	const [agentJar, setAgentJar] = useState("");
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [specificError, setSpecificError] = useState("");
	const [step, setStep] = useState(1);

	const { repo, repoPath } = derivedState;

	// const messagesEndRef = useRef(null);

	useEffect(() => {
		// TODO
		const El = document.getElementById("xyz")!;
		if (El) {
			El.scrollTo({ top: El.scrollHeight, behavior: "smooth" });
		}
	}, [derivedState.bufferText]);

	useDidMount(() => {
		if (!repoPath) {
			setSpecificError("Please ensure you have a git repository open and try again.");
			setStep(0);
		}

		return () => {
			dispatch(clearProcessBuffer({}));

			if (repoPath) {
				void HostApi.instance.send(EditorRevealRangeRequestType, {
					uri: path.join("file://", repoPath, "NrStart.cmd"),
					range: Range.create(0, 0, 0, 0),
				});
			}
		};
	});

	useEffect(() => {
		if (!repo) {
			// FIXME: what should we really do here?
			dispatch(closeModal());
		}
	}, [repo]);

	const onInstallLibrary = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setInstallingLibrary(true);
		const response = (await HostApi.instance.send(InstallNewRelicRequestType, {
			type: RepoProjectType.DotNetCore,
			cwd: cwd || repoPath!,
		})) as InstallNewRelicResponse;
		if (response.error) {
			logError(`Unable to install New Relic module: ${response.error}`);
			setUnexpectedError(true);
		} else {
			setUnexpectedError(false);
			setStep(4);
		}
		setInstallingLibrary(false);
	};

	const onCreateConfigFile = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setCreatingConfig(true);
		const response = (await HostApi.instance.send(CreateNewRelicConfigFileRequestType, {
			type: RepoProjectType.DotNetCore,
			repoPath: repoPath!,
			filePath: cwd || repoPath!,
			appName,
			licenseKey: licenseKey,
		})) as CreateNewRelicConfigFileResponse;
		if (response.error) {
			logError(`Unable to create New Relic config file: ${response.error}`);
			setUnexpectedError(true);
		} else {
			setUnexpectedError(false);
			setAgentJar(response.agentJar!);
			setStep(5);
		}
		setCreatingConfig(false);
	};

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>
					<Icon name="dot-net" />
					<br />
					Add App Monitoring for .NET Core
				</h3>
				<p className="explainer">Monitor the performance of your app by installing an agent</p>
				<Dialog>
					<div className="standard-form">
						<fieldset className="form-body">
							<div id="controls">
								<div className="small-spacer" />
								{specificError && <div className="error-message form-error">{specificError}</div>}
								{unexpectedError && (
									<div className="error-message form-error">
										<FormattedMessage
											id="error.unexpected"
											defaultMessage="Something went wrong! Please try again, or "
										/>
										<FormattedMessage id="contactSupport" defaultMessage="contact support">
											{text => (
												<Link href="https://docs.newrelic.com/docs/codestream/">{text}</Link>
											)}
										</FormattedMessage>
										.
									</div>
								)}
								<div className="control-group">
									{/*
									<InstallRow className={step > 0 ? "row-active" : ""}>
										<StepNumber>1</StepNumber>
										<div>
											<label>
												Paste your{" "}
												<Link href="https://docs.newrelic.com/docs/accounts/accounts-billing/account-setup/new-relic-license-key/">
													New Relic license key
												</Link>
												:
											</label>
											<TextInput
												name="licenseKey"
												value={licenseKey}
												onChange={onSetLicenseKey}
												nativeProps={{ id: "licenseKeyInput" }}
											/>
										</div>
										<Button
											isDone={step > 1}
											onClick={() => {
												setStep(2);
												document.getElementById("appName")?.focus();
											}}
											disabled={licenseKey.length == 0}
										>
											Save
										</Button>
									</InstallRow>
										*/}
									<InstallRow className={step > 0 ? "row-active" : ""}>
										<StepNumber>1</StepNumber>
										<div>
											<label>Type a name for your application:</label>
											<TextInput
												name="appName"
												value={appName}
												onChange={value => setAppName(value)}
												nativeProps={{ id: "appName" }}
												autoFocus
											/>
										</div>
										<Button
											isDone={step > 1}
											onClick={() => setStep(2)}
											disabled={appName.length == 0}
										>
											Save
										</Button>
									</InstallRow>
									<InstallRow className={step > 1 ? "row-active" : ""}>
										<StepNumber>2</StepNumber>
										<div>
											Paste your{" "}
											<Link href="https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/#ingest-license-key">
												New Relic license key
											</Link>
											:
											<TextInput
												name="licenseKey"
												value={licenseKey}
												onChange={value => setLicenseKey(value)}
												nativeProps={{ id: "licenseKey" }}
												autoFocus
											/>
										</div>
										<Button
											isDone={step > 2}
											onClick={() => setStep(3)}
											disabled={licenseKey.length == 0}
										>
											Save
										</Button>
									</InstallRow>
									<InstallRow className={step > 2 ? "row-active" : ""}>
										<StepNumber>3</StepNumber>
										<div>
											<label>
												Click to install the New Relic Agent in your repo. This will run: <br />
												<code>dotnet add package NewRelic.Agent</code>
												{props.newRelicOptions.projects &&
													props.newRelicOptions.projects.length > 1 && (
														<div>
															<select onChange={e => setCwd(e.target.value)}>
																{props.newRelicOptions.projects.map(_ => {
																	return <option value={_.path}>{_.name || _.path}</option>;
																})}
															</select>
														</div>
													)}
											</label>

											{/* <div>
												<div style={{ maxWidth: "255px", height: "100px" }}>
													<pre
														className={"buffer-text"}
														id="xyz"
														ref={messagesEndRef}
														style={{ width: "100%", height: "100px", overflowY: "auto" }}
													>
														{derivedState.bufferText}
													</pre>
												</div>
											</div> */}
										</div>
										<Button
											onClick={onInstallLibrary}
											isLoading={installingLibrary}
											isDone={step > 3}
										>
											Install
										</Button>
									</InstallRow>
									<InstallRow className={step > 3 ? "row-active" : ""}>
										<StepNumber>4</StepNumber>
										<div>
											<label>
												Create a custom configuration file in
												<br />
												<code>
													{(cwd || "").split(/(\/)/).map(part => (
														<>
															{part}
															<wbr />
														</>
													))}
												</code>
											</label>
										</div>
										<Button
											onClick={onCreateConfigFile}
											isLoading={creatingConfig}
											isDone={step > 4}
										>
											Create
										</Button>
									</InstallRow>
									<InstallRow className={step > 4 ? "row-active" : ""}>
										<StepNumber>5</StepNumber>
										<div>
											<label>To start sending data to New Relic run the NrStart.cmd file</label>
										</div>
										<Button onClick={() => props.skip(1, { appName: appName })} isDone={step > 6}>
											OK
										</Button>
									</InstallRow>
								</div>
							</div>
						</fieldset>
					</div>
				</Dialog>
				<SkipLink onClick={() => props.skip(999)}>I'll do this later</SkipLink>
			</div>
		</Step>
	);
};
