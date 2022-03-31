import {
	NewRelicAccount,
	PixieCluster,
	PixieDynamicLoggingReponse,
	PixieDynamicLoggingRequestType,
	PixiePod,
	TelemetryRequestType
} from "@codestream/protocols/agent";
import { Button } from "@codestream/webview/src/components/Button";
import {
	clearDynamicLogging,
	pixieDynamicLoggingCancel
} from "@codestream/webview/store/dynamicLogging/actions";
import { isConnected } from "@codestream/webview/store/providers/reducer";
import { ConditionalNewRelic } from "@codestream/webview/Stream/CodeError/ConditionalComponent";
import ConfigureNewRelic from "@codestream/webview/Stream/ConfigureNewRelic";
import { Accounts } from "@codestream/webview/Stream/PixieDynamicLogging/Accounts";
import { Clusters } from "@codestream/webview/Stream/PixieDynamicLogging/Clusters";
import { Namespaces } from "@codestream/webview/Stream/PixieDynamicLogging/Namespaces";
import { Pods } from "@codestream/webview/Stream/PixieDynamicLogging/Pods";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { Dialog } from "../../src/components/Dialog";
import { PanelHeader } from "../../src/components/PanelHeader";
import { CodeStreamState } from "../../store";
import { closePanel, setUserPreference } from "../actions";
import { DropdownButton } from "../DropdownButton";
import { useDidMount } from "@codestream/webview/utilities/hooks";

const Root = styled.div`
	color: var(--text-color);
	position: relative;
	h2,
	h3 {
		color: var(--text-color-highlight);
	}

	h3 {
		margin: 30px 0 5px 0;
		.icon {
			margin-right: 5px;
			vertical-align: -2px;
		}
	}
`;

const DropdownWrapper = styled.div`
	margin: 5px 0;
	label {
		display: block;
	}
`;

export const PixieDynamicLoggingPanel = () => {
	const dispatch = useDispatch();
	const [account, setAccount] = React.useState<NewRelicAccount | undefined>();
	const [cluster, setCluster] = React.useState<PixieCluster | undefined>();
	const [namespace, setNamespace] = React.useState<string | undefined>();
	const [pod, setPod] = React.useState<PixiePod | undefined>();

	useDidMount(() => {
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Pixie Logging Selected",
			properties: {}
		});
	});

	const setAndSaveAccount = account => {
		setAccount(account);
		setCluster(undefined);
		setNamespace(undefined);
		setPod(undefined);
		if (account) dispatch(setUserPreference(["pixieDefaultAccountId"], account.id.toString()));
	};

	const setAndSaveCluster = cluster => {
		setCluster(cluster);
		setNamespace(undefined);
		setPod(undefined);
		if (cluster) dispatch(setUserPreference(["pixieDefaultClusterId"], cluster.clusterId));
	};

	const setAndSaveNamespace = namespace => {
		setNamespace(namespace);
		setPod(undefined);
		if (namespace) dispatch(setUserPreference(["pixieDefaultNamespace"], namespace));
	};

	const setAndSavePod = pod => {
		setPod(pod);
		if (pod) dispatch(setUserPreference(["pixieDefaultPodUpid"], pod.upid));
	};

	return (
		<Dialog wide noPadding onClose={() => dispatch(closePanel())}>
			<PanelHeader title="Dynamic Logging Using Pixie"></PanelHeader>
			<ConditionalNewRelic
				connected={
					<>
						<div style={{ padding: "0 20px 20px 20px" }}>
							<DropdownWrapper>
								<label>Account:</label>
								<Accounts onSelect={setAndSaveAccount} value={account} />
							</DropdownWrapper>
							{account && (
								<DropdownWrapper>
									<label>Cluster:</label>
									<Clusters account={account} onSelect={setAndSaveCluster} value={cluster} />
								</DropdownWrapper>
							)}
							{cluster && (
								<DropdownWrapper>
									<label>Namespace:</label>
									<Namespaces
										account={account}
										cluster={cluster}
										onSelect={setAndSaveNamespace}
										value={namespace}
									/>
								</DropdownWrapper>
							)}
							{namespace && (
								<DropdownWrapper>
									<label>Pod:</label>
									<Pods
										account={account}
										cluster={cluster}
										namespace={namespace}
										onSelect={setAndSavePod}
										value={pod}
									/>
								</DropdownWrapper>
							)}
						</div>
						{account && cluster && pod && (
							<PixieDynamicLogging account={account} cluster={cluster} pod={pod} />
						)}
					</>
				}
				disconnected={
					<Dialog narrow title="">
						<div className="embedded-panel">
							<ConfigureNewRelic
								headerChildren={
									<>
										<div className="panel-header" style={{ background: "none" }}>
											<span className="panel-title">Connect to New Relic</span>
										</div>
										<div style={{ textAlign: "center" }}>
											Working with Pixie requires a connection to your New Relic account. If you
											don't have one, get a teammate to invite you.
										</div>
									</>
								}
								disablePostConnectOnboarding={true}
								showSignupUrl={false}
								providerId={"newrelic*com"}
								onClose={e => {
									// setOpenConnectionModal(false);
								}}
								onSubmited={async e => {
									// setOpenConnectionModal(false);
								}}
								originLocation={"Pixie Logging"}
							/>
						</div>
					</Dialog>
				}
			/>
		</Dialog>
	);
};

interface IPixieDynamicLoggingContext {
	account?: NewRelicAccount;
}

const PixieDynamicLogging = props => {
	const rootRef = React.useRef(null);

	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers = {}, context, dynamicLogging } = state;
		const newRelicIsConnected =
			providers["newrelic*com"] && isConnected(state, { id: "newrelic*com" });

		const dynamicLogs = dynamicLogging?.dynamicLogs;
		const status =
			dynamicLogs?.status === "Capturing" ? (
				<span>
					Capturing calls to <b>{context.currentPixieDynamicLoggingOptions?.functionName}</b>...
				</span>
			) : (
				dynamicLogs?.status
			);
		const hasStatus = status && status !== "Cancelled";
		return {
			newRelicIsConnected,
			currentPixieDynamicLoggingOptions: context.currentPixieDynamicLoggingOptions,
			dynamicLogs,
			hasStatus,
			status
		};
	}, shallowEqual);

	const [minutes, setMinutes] = React.useState(1);
	const [isLoading, setIsLoading] = React.useState(false);
	const [isCancelling, setIsCancelling] = React.useState(false);
	const [loggingId, setLoggingId] = React.useState("");

	useEffect(() => {
		// TODO
		const El = document.getElementById("xyz")!;
		if (El) {
			El.scrollTo({ top: El.scrollHeight, behavior: "smooth" });
		}
	}, [derivedState.dynamicLogs?.results]);

	const startLogging = async time => {
		setMinutes(time);
		if (derivedState.currentPixieDynamicLoggingOptions) {
			setIsLoading(true);
			HostApi.instance.send(TelemetryRequestType, {
				eventName: "Pixie Logging Started",
				properties: {}
			});
			const result: PixieDynamicLoggingReponse = await HostApi.instance.send(
				PixieDynamicLoggingRequestType,
				{
					accountId: props.account.id,
					clusterId: props.cluster.clusterId,
					upid: props.pod.upid,
					limitSeconds: time * 60,
					...derivedState.currentPixieDynamicLoggingOptions
				}
			);
			setLoggingId(result.id);
			setTimeout(() => setIsLoading(false), 2000);
		}
	};

	const stopLogging = async () => {
		setIsCancelling(true);
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Pixie Logging Stopped",
			properties: {}
		});
		await dispatch(pixieDynamicLoggingCancel({ id: loggingId }));
		setTimeout(() => setIsCancelling(false), 2000);
	};

	const resetLogging = () => {
		dispatch(clearDynamicLogging());
	};

	return (
		<Root ref={rootRef}>
			<div
				style={{
					padding: "20px",
					borderTop: "1px solid var(--base-border-color)"
				}}
			>
				{!derivedState.hasStatus ? (
					<DropdownButton
						items={[1, 2, 3, 4, 5, 10].map(time => {
							return {
								label: `Capture for ${time} minute${time > 1 ? "s" : ""}`,
								key: `${time}`,
								action: () => startLogging(time)
							};
						})}
						splitDropdown
						splitDropdownInstantAction
						isLoading={isLoading}
						disabled={!derivedState.currentPixieDynamicLoggingOptions}
					>
						Capture for {minutes} minute{minutes > 1 ? "s" : ""}
					</DropdownButton>
				) : (
					<div>
						<div style={{ display: "flex", alignItems: "center" }}>
							<div style={{ marginRight: "10px" }}>{derivedState.status}</div>
							<div style={{ marginLeft: "auto" }}>
								{derivedState.dynamicLogs?.status?.match("Done") ? (
									<Button
										variant="destructive"
										size="compact"
										onClick={resetLogging}
										isLoading={isCancelling}
									>
										Reset
									</Button>
								) : (
									<Button
										variant="destructive"
										size="compact"
										onClick={stopLogging}
										isLoading={isCancelling}
									>
										Stop
									</Button>
								)}
							</div>
						</div>
						{derivedState.dynamicLogs && derivedState.dynamicLogs.results && (
							<div style={{ height: "10px" }} />
						)}

						<div style={{ width: "100%", overflowX: "auto" }}>
							<table style={{ borderCollapse: "collapse", width: "100%" }}>
								<tr
									style={{
										borderTop: "1px solid #888",
										borderBottom: "2px solid #888"
									}}
								>
									{derivedState.dynamicLogs &&
										derivedState.dynamicLogs.metaData?.slice(3)?.map((_, index) => {
											return (
												<td
													style={{
														width: "25%",
														padding: "5px 1px",
														fontWeight: "bold"
													}}
												>
													{_}
												</td>
											);
										})}
								</tr>
								{derivedState.dynamicLogs &&
									derivedState.dynamicLogs.results?.map((_, index) => {
										return (
											<>
												<tr style={{ borderBottom: "1px solid #888" }}>
													{Object.keys(_).map(k => {
														return (
															<td
																style={{ width: "25%", padding: "3px 1px", whiteSpace: "nowrap" }}
															>
																{_[k]}
															</td>
														);
													})}
												</tr>
											</>
										);
									})}
							</table>
						</div>
					</div>
				)}
			</div>
		</Root>
	);
};
