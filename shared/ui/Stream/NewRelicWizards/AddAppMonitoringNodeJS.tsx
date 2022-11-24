import {
	AddNewRelicIncludeRequestType,
	AddNewRelicIncludeResponse,
	CreateNewRelicConfigFileRequestType,
	CreateNewRelicConfigFileResponse,
	FindCandidateMainFilesRequestType,
	FindCandidateMainFilesResponse,
	InstallNewRelicRequestType,
	InstallNewRelicResponse,
	NewRelicOptions,
	RepoProjectType,
} from "@codestream/protocols/agent";
import * as path from "path-browserify";
import React, { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { Position, Range } from "vscode-languageserver-types";

import { useDidMount } from "@codestream/webview/utilities/hooks";
import { TextInput } from "../../Authentication/TextInput";
import { logError } from "../../logger";
import { Button } from "../../src/components/Button";
import { InlineMenu } from "../../src/components/controls/InlineMenu";
import { Dialog } from "../../src/components/Dialog";
import { CodeStreamState } from "../../store";
import { highlightRange } from "../../Stream/api-functions";
import { HostApi } from "../../webview-api";
import { closeModal } from "../actions";
import Icon from "../Icon";
import { Link } from "../Link";
import { SkipLink, Step } from "../Onboard";
import { InstallRow, StepNumber } from "../OnboardNewRelic";

export const AddAppMonitoringNodeJS = (props: {
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
	const [files, setFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState("");
	const [installingLibrary, setInstallingLibrary] = useState(false);
	const [creatingConfig, setCreatingConfig] = useState(false);
	const [insertingRequire, setInsertingRequire] = useState(false);
	const [loading, setLoading] = useState(false);
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [specificError, setSpecificError] = useState("");
	const [step, setStep] = useState(1);

	const { repo, repoPath } = derivedState;

	useEffect(() => {
		(async () => {
			if (repoPath) {
				const response = (await HostApi.instance.send(FindCandidateMainFilesRequestType, {
					type: RepoProjectType.NodeJS,
					path: repoPath,
				})) as FindCandidateMainFilesResponse;
				if (!response.error) {
					setFiles(response.files);
					setSpecificError("");
					setStep(1);
				}
			}
		})();
	}, [repoPath]);

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
			type: RepoProjectType.NodeJS,
			cwd: repoPath!,
		})) as InstallNewRelicResponse;
		if (response.error) {
			logError(`Unable to install New Relic module: ${response.error}`);
			setUnexpectedError(true);
		} else {
			setUnexpectedError(false);
			setStep(step + 1);
		}
		setInstallingLibrary(false);
	};

	const onCreateConfigFile = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setCreatingConfig(true);
		const response = (await HostApi.instance.send(CreateNewRelicConfigFileRequestType, {
			type: RepoProjectType.NodeJS,
			filePath: repoPath!,
			appName,
			licenseKey,
		})) as CreateNewRelicConfigFileResponse;
		if (response.error) {
			logError(`Unable to create New Relic config file: ${response.error}`);
			setUnexpectedError(true);
		} else {
			setUnexpectedError(false);
			setStep(step + 1);
		}
		setCreatingConfig(false);
	};

	const onRequireNewRelic = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setInsertingRequire(true);
		const response = (await HostApi.instance.send(AddNewRelicIncludeRequestType, {
			type: RepoProjectType.NodeJS,
			file: selectedFile || files[0],
			dir: repoPath!,
		})) as AddNewRelicIncludeResponse;
		if (response.error) {
			logError(`Unable to add New Relic include to ${selectedFile}: ${response.error}`);
			setUnexpectedError(true);
		} else {
			setUnexpectedError(false);
			setStep(step + 1);
		}
		setInsertingRequire(false);

		const start = Position.create(0, 0);
		const end = Position.create(0, 10000);
		const range = Range.create(start, end);
		const includeFile = path.join(repoPath!, selectedFile);
		highlightRange({
			uri: `file://${includeFile}`,
			range,
			highlight: true,
		});
	};

	const fileItems = files.map((file, i) => {
		return {
			key: file,
			label: file,
			checked: selectedFile === file,
			default: i === 0,
			action: () => setSelectedFile(file),
		};
	});

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>
					<Icon name="node" />
					<br />
					Add App Monitoring for Node JS
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
												Install the node module in your repo:
												<br />
												<code>npm install --save newrelic</code>
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
										<div style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
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
												Add{" "}
												<code>
													require
													<wbr />
													("newrelic")
												</code>{" "}
												to{" "}
											</label>
											<code>
												<InlineMenu
													key="team-display-options"
													className="no-padding"
													items={fileItems}
												>
													{selectedFile || files[0]}
												</InlineMenu>
											</code>
										</div>
										<Button
											onClick={onRequireNewRelic}
											isLoading={insertingRequire}
											isDone={step > 5}
										>
											Add
										</Button>
									</InstallRow>
									<InstallRow className={step > 5 ? "row-active" : ""}>
										<StepNumber>6</StepNumber>
										<div>
											<label>
												Restart your application to start sending your data to New Relic
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
