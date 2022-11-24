import {
	CreateNewRelicConfigFileRequestType,
	CreateNewRelicConfigFileResponse,
	InstallNewRelicRequestType,
	InstallNewRelicResponse,
	NewRelicOptions,
	RepoProjectType,
} from "@codestream/protocols/agent";
import React, { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import { useDidMount } from "@codestream/webview/utilities/hooks";
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

export const AddAppMonitoringJava = (props: {
	className: string;
	skip: Function;
	newRelicOptions: NewRelicOptions;
}) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { repoId, path } = state.context.wantNewRelicOptions || {};
		const repo = repoId ? state.repos[repoId] : undefined;
		return { repo, repoPath: path };
	});

	const [appName, setAppName] = useState("");
	const [licenseKey, setLicenseKey] = useState("");
	const [installingLibrary, setInstallingLibrary] = useState(false);
	const [creatingConfig, setCreatingConfig] = useState(false);
	const [agentJar, setAgentJar] = useState("");
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [specificError, setSpecificError] = useState("");
	const [step, setStep] = useState(1);

	const { repo, repoPath } = derivedState;

	useEffect(() => {
		if (!repo) {
			// FIXME: what should we really do here?
			dispatch(closeModal());
		}
	}, [repo]);

	useDidMount(() => {
		if (!repoPath) {
			setSpecificError("Please ensure you have a git repository open and try again.");
			setStep(0);
		}
	});

	const onInstallLibrary = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setInstallingLibrary(true);
		const response = (await HostApi.instance.send(InstallNewRelicRequestType, {
			type: RepoProjectType.Java,
			cwd: repoPath!,
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
			type: RepoProjectType.Java,
			filePath: repoPath!,
			appName,
			licenseKey,
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
					<Icon name="java" />
					<br />
					Add App Monitoring for Java
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
												Download and install the agent in your repo
												<br />
												<code>
													curl -O https:
													<wbr />
													//download
													<wbr />
													.newrelic
													<wbr />
													.com
													<wbr />
													/newrelic
													<wbr />
													/java-agent
													<wbr />
													/newrelic-agent
													<wbr />
													/current
													<wbr />
													/newrelic-
													<wbr />
													java
													<wbr />
													.zip
												</code>
											</label>
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
													{(repoPath || "").split(/(\/)/).map(part => (
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
											<label>
												To start sending data to New Relic, recompile and restart your application
												with <b>-javaagent:{agentJar}</b>
											</label>
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
