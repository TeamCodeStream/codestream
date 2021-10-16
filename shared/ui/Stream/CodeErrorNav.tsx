import React from "react";
import { useEffect } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { closeAllPanels, setCurrentCodeError } from "@codestream/webview/store/context/actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import {
	addCodeErrors,
	api,
	fetchCodeError,
	fetchErrorGroup,
	NewCodeErrorAttributes,
	PENDING_CODE_ERROR_ID_PREFIX,
	resolveStackTrace,
	setErrorGroup
} from "@codestream/webview/store/codeErrors/actions";
import { CodeStreamState } from "../store";
import { getCodeError, getErrorGroup } from "../store/codeErrors/reducer";
import { Meta, BigTitle, Header } from "./Codemark/BaseCodemark";
import { closePanel, createPostAndCodeError, markItemRead } from "./actions";
import { Dispatch } from "../store/common";
import { CodeError, BaseCodeErrorHeader, ExpandedAuthor, Description } from "./CodeError";
import ScrollBox from "./ScrollBox";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import Icon from "./Icon";
import { isConnected } from "../store/providers/reducer";
import { ConfigureNewRelic } from "./ConfigureNewRelic";
import Dismissable from "./Dismissable";
import { bootstrapCodeErrors } from "@codestream/webview/store/codeErrors/actions";
import { DelayedRender } from "../Container/DelayedRender";
import { LoadingMessage } from "../src/components/LoadingMessage";
import {
	GetNewRelicErrorGroupRequestType,
	ResolveStackTraceResponse,
	MatchReposRequestType,
	MatchReposResponse,
	NewRelicErrorGroup,
	NormalizeUrlRequestType,
	NormalizeUrlResponse
} from "@codestream/protocols/agent";
import { HostApi } from "..";
import { CSCodeError } from "@codestream/protocols/api";

import { RepositoryAssociator } from "./CodeError/RepositoryAssociator";
import { logWarning } from "../logger";

const NavHeader = styled.div`
	// flex-grow: 0;
	// flex-shrink: 0;
	// display: flex;
	// align-items: flex-start;
	padding: 15px 10px 10px 15px;
	// justify-content: center;
	width: 100%;
	${Header} {
		margin-bottom: 0;
	}
	${BigTitle} {
		font-size: 16px;
	}
`;

const Root = styled.div`
	max-height: 100%;
	display: flex;
	flex-direction: column;
	&.tour-on {
		${Meta},
		${Description},
		${ExpandedAuthor},
		${Header},
		.replies-to-review {
			opacity: 0.25;
		}
	}
	#changed-files {
		transition: opacity 0.2s;
	}
	.pulse #changed-files {
		opacity: 1;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		background: var(--app-background-color-hover);
	}

	.scroll-container {
		flex-grow: 1;
		width: 100%;
		overflow: auto;
		zindex: 1;
	}

	// prefer icons to text
	@media only screen and (max-width: 430px) {
		.btn-group {
			button {
				.narrow-icon {
					display: block;
					margin: 0;
				}
				padding: 3px 5px;
				line-height: 1em;
			}
		}
		.wide-text {
			display: none;
		}
	}

`;

export const CodeErrorErrorBox = styled.div`
	margin: 10px 10px 20px 0;
	border: 1px solid rgba(249, 197, 19, 0.6);
	background: rgba(255, 223, 0, 0.1);
	border-radius: 5px;
	padding: 10px;
	display: flex;
	align-items: center;
	.icon.alert {
		display: inline-block;
		transform: scale(1.5);
		margin: 0 10px;
	}
	.message {
		margin-left: 10px;
	}
`;

export const StyledCodeError = styled.div``;

export type Props = React.PropsWithChildren<{ codeErrorId: string; composeOpen: boolean }>;

/**
 * Called from InlineCodemarks it is what allows the commenting on lines of code
 *
 * @export
 * @param {Props} props
 * @return {*}
 */
export function CodeErrorNav(props: Props) {
	const dispatch = useDispatch<Dispatch | any>();
	const derivedState = useSelector((state: CodeStreamState) => {
		const codeError = state.context.currentCodeErrorId
			? (getCodeError(state.codeErrors, state.context.currentCodeErrorId) as CSCodeError)
			: undefined;
		const errorGroup = getErrorGroup(state.codeErrors, codeError) as NewRelicErrorGroup;

		const result = {
			demoMode: state.preferences.demoMode,
			codeErrorStateBootstrapped: state.codeErrors.bootstrapped,
			currentCodeErrorId: state.context.currentCodeErrorId,
			currentCodeErrorData: state.context.currentCodeErrorData,
			sessionStart: state.context.sessionStart,

			codeError: codeError,
			currentCodemarkId: state.context.currentCodemarkId,
			isConnectedToNewRelic: isConnected(state, { id: "newrelic*com" }),
			errorGroup: errorGroup,
			repos: state.repos
		};
		// console.warn(JSON.stringify(result, null, 4));
		return result;
	});

	const [requiresConnection, setRequiresConnection] = React.useState<boolean | undefined>(
		undefined
	);
	const [isEditing, setIsEditing] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(true);
	const [error, setError] = React.useState<
		{ title?: string; description: string; details?: any } | undefined
	>(undefined);

	const [repoAssociationError, setRepoAssociationError] = React.useState<
		{ title: string; description: string } | undefined
	>(undefined);
	const [repoWarning, setRepoWarning] = React.useState<string | undefined>(undefined);
	const [repoError, setRepoError] = React.useState<string | undefined>(undefined);
	const { codeError, errorGroup } = derivedState;
	const [isResolved, setIsResolved] = React.useState(false);
	const [parsedStack, setParsedStack] = React.useState<ResolveStackTraceResponse | undefined>(
		undefined
	);

	const pendingErrorGroupGuid = derivedState.currentCodeErrorData?.pendingErrorGroupGuid;
	const pendingEntityId = derivedState.currentCodeErrorData?.pendingEntityId;
	const occurrenceId = derivedState.currentCodeErrorData?.occurrenceId;
	const remote = derivedState.currentCodeErrorData?.remote;
	const commit = derivedState.currentCodeErrorData?.commit;

	const pendingRequiresConnection = derivedState.currentCodeErrorData?.pendingRequiresConnection;

	const exit = async () => {
		// clear out the current code error (set to blank) in the webview
		await dispatch(setCurrentCodeError(undefined, undefined));
		dispatch(closePanel());
	};

	const unreadEnabled = useSelector((state: CodeStreamState) =>
		isFeatureEnabled(state, "readItem")
	);

	const markRead = () => {
		// @ts-ignore
		if (codeError && unreadEnabled) dispatch(markItemRead(codeError.id, codeError.numReplies || 0));
	};

	useEffect(() => {
		if (
			derivedState.sessionStart &&
			derivedState.currentCodeErrorData?.sessionStart &&
			derivedState.currentCodeErrorData?.sessionStart !== derivedState.sessionStart
		) {
			logWarning("preventing reload from creating a codeError, sessionStart mismatch", {
				currentCodeErrorDataSessionStart: derivedState.currentCodeErrorData?.sessionStart,
				sessionStart: derivedState.sessionStart
			});
			dispatch(setCurrentCodeError(undefined, undefined));
			dispatch(closeAllPanels());
			return;
		}

		if (pendingRequiresConnection) {
			setRequiresConnection(pendingRequiresConnection);
		} else if (pendingErrorGroupGuid) {
			onConnected();
		} else {
			const onDidMount = () => {
				if (codeError) {
					setIsLoading(false);
				} else {
					dispatch(fetchCodeError(derivedState.currentCodeErrorId!))
						.then((_: any) => {
							if (!_ || !_.payload.length) {
								setError({
									title: "Cannot open Code Error",
									description:
										"This code error was not found. Perhaps it was deleted by the author, or you don't have permission to view it."
								});
							} else {
								markRead();
							}
						})
						.catch(ex => {
							setError({
								title: "Error",
								description: ex.message ? ex.message : ex.toString()
							});
						})
						.finally(() => {
							setIsLoading(false);
						});
				}
			};
			if (!derivedState.codeErrorStateBootstrapped) {
				dispatch(bootstrapCodeErrors()).then(() => {
					onDidMount();
				});
			} else {
				onDidMount();
			}
		}
	}, [derivedState.currentCodeErrorId]);

	useEffect(() => {
		if (!codeError || !codeError.objectId || !derivedState.isConnectedToNewRelic || errorGroup) {
			return;
		}

		setIsLoading(true);
		dispatch(fetchErrorGroup(codeError));
		setTimeout(() => {
			setIsLoading(false);
		}, 1);
	}, [codeError, derivedState.isConnectedToNewRelic, errorGroup]);

	useEffect(() => {
		if (!errorGroup) return;

		if (!errorGroup.hasStackTrace) {
			setError({
				title: "Missing Stack Trace",
				description:
					"This error report does not have a stack trace associated with it and cannot be displayed."
			});
		}

		if (!isResolved) {
			if (!codeError?.objectInfo?.repoId) {
				setRepoAssociationError({
					title: "Missing Repository Info",
					description: `In order to view this stack trace, please select a repository to associate with ${
						errorGroup ? errorGroup.entityName + " " : ""
					}on New Relic.`
				});
				return;
			}
			resolveStackTrace(
				codeError?.objectInfo?.repoId!,
				codeError?.stackTraces ? codeError?.stackTraces[0].sha || "" : "",
				occurrenceId!,
				errorGroup?.errorTrace!?.stackTrace.map(_ => _.formatted)
			)
				.then((stackInfo: ResolveStackTraceResponse) => {
					setParsedStack(stackInfo);
					setRepoError(stackInfo?.error);
					setRepoWarning(stackInfo?.warning);
				})
				.catch(ex => console.warn(ex))
				.then(() => {
					setIsResolved(true);
				});
		}
	}, [errorGroup, isResolved]);

	const onConnected = async (newRemote?: string) => {
		console.warn("onConnected starting...");
		if (!pendingErrorGroupGuid) {
			return;
		}
		console.warn("onConnected started");
		setIsLoading(true);
		setRepoAssociationError(undefined);
		setError(undefined);

		try {
			const errorGroupGuid = pendingErrorGroupGuid;
			const errorGroupResult = await HostApi.instance.send(GetNewRelicErrorGroupRequestType, {
				errorGroupGuid: errorGroupGuid!,
				occurrenceId: occurrenceId!,
				entityGuid: pendingEntityId
			});

			if (!errorGroupResult || errorGroupResult?.error?.message) {
				setError({
					title: "Unexpected Error",
					description: errorGroupResult?.error?.message || "unknown error",
					details: errorGroupResult?.error?.details
				});
				return;
			}
			if (errorGroupResult?.errorGroup != null) {
				dispatch(setErrorGroup(errorGroupGuid, errorGroupResult.errorGroup!));
			}
			let targetRemote = newRemote || remote;
			if (errorGroupResult?.errorGroup?.entity?.repo?.urls != null) {
				targetRemote = errorGroupResult?.errorGroup?.entity?.repo?.urls[0]!;
			}
			if (!targetRemote) {
				setRepoAssociationError({
					title: "Missing Repository Info",
					description: `In order to view this stack trace, please select a repository to associate with ${
						errorGroup ? errorGroup.entityName + " " : ""
					}on New Relic.`
				});
				return;
			}

			const normalizationResponse = (await HostApi.instance.send(NormalizeUrlRequestType, {
				url: targetRemote
			})) as NormalizeUrlResponse;
			if (!normalizationResponse || !normalizationResponse.normalizedUrl) {
				setError({
					title: "Error",
					description: `Could not find a matching repo for the remote ${targetRemote}`
				});
				return;
			}

			const reposResponse = (await HostApi.instance.send(MatchReposRequestType, {
				repos: [
					{
						remotes: [normalizationResponse.normalizedUrl],
						knownCommitHashes: commit ? [commit] : []
					}
				]
			})) as MatchReposResponse;

			if (reposResponse?.repos?.length === 0) {
				setError({
					title: "Repo Not Found",
					description: `Please open the following repository: ${targetRemote}`
				});
				return;
			}

			if (
				errorGroupResult &&
				errorGroupResult.errorGroup &&
				!errorGroupResult.errorGroup.hasStackTrace
			) {
				setError({
					title: "Missing Stack Trace",
					description:
						"This error report does not have a stack trace associated with it and cannot be displayed."
				});
			} else {
				const repo = reposResponse.repos[0];
				const stackInfo = (await resolveStackTrace(
					repo.id!,
					commit!,
					occurrenceId!,
					errorGroupResult.errorGroup?.errorTrace!?.stackTrace.map(_ => _.formatted)
				)) as ResolveStackTraceResponse;

				if (
					derivedState.currentCodeErrorId &&
					derivedState.currentCodeErrorId?.indexOf(PENDING_CODE_ERROR_ID_PREFIX) === 0
				) {
					await dispatch(
						addCodeErrors([
							{
								accountId: errorGroupResult.accountId,
								id: derivedState.currentCodeErrorId!,
								createdAt: new Date().getTime(),
								modifiedAt: new Date().getTime(),
								// these don't matter
								assignees: [],
								teamId: "",
								streamId: "",
								postId: "",
								fileStreamIds: [],
								status: "open",
								numReplies: 0,
								lastActivityAt: 0,
								creatorId: "",
								objectId: errorGroupGuid,
								objectType: "errorGroup",
								title: errorGroupResult.errorGroup?.title || "",
								text: errorGroupResult.errorGroup?.message || undefined,
								// storing the permanently parsed stack info
								stackTraces: stackInfo.error
									? [{ ...stackInfo, lines: [] }]
									: [stackInfo.parsedStackInfo!],
								objectInfo: {
									repoId: repo.id,
									remote: targetRemote,
									accountId: errorGroupResult.accountId.toString(),
									entityName: errorGroupResult?.errorGroup?.entityName || ""
								}
							}
						])
					);
				}
				setParsedStack(stackInfo);
				setIsResolved(true);
				setRepoError(stackInfo?.error);
				setRepoWarning(stackInfo?.warning);
			}
			HostApi.instance.track("Error Report Opened", {
				"Error Group ID": errorGroupResult?.errorGroup?.guid,
				"NR Organization ID": "",
				"NR Account ID": errorGroupResult.accountId,
				"Entry Point": "Open in IDE Flow"
			});
		} catch (ex) {
			console.warn(ex);
			setError({
				title: "Unexpected Error",
				description: ex.message ? ex.message : ex.toString()
			});
		} finally {
			setRequiresConnection(false);
			setIsLoading(false);
		}
	};

	useDidMount(() => {
		// Kind of a HACK leaving this here, BUT...
		// since <CancelButton /> uses the OLD version of Button.js
		// and not Button.tsx (below), there's no way to keep the style.
		// if Buttons can be consolidated, this could go away
		const disposable = KeystrokeDispatcher.onKeyDown(
			"Escape",
			event => {
				if (event.key === "Escape" && event.target.id !== "input-div") exit();
			},
			{ source: "CodeErrorNav.tsx", level: -1 }
		);

		return () => {
			disposable && disposable.dispose();
		};
	});

	// if for some reason we have a codemark, don't render anything
	if (derivedState.currentCodemarkId) return null;

	if (error) {
		// essentially a roadblock
		return (
			<Dismissable
				title={error.title || "Error"}
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							exit();
						}
					}
				]}
			>
				<p>{error.description}</p>
				{error?.details?.settings && (
					<div>
						<b>Internal Debugging Variables</b>
						<dl style={{ overflow: "auto" }}>
							{Object.keys(error.details.settings).map(_ => {
								return (
									<>
										<dt>{_}</dt>
										<dd>{error.details.settings[_]}</dd>
									</>
								);
							})}
						</dl>
					</div>
				)}
			</Dismissable>
		);
	}
	if (repoAssociationError) {
		// essentially a roadblock
		return (
			<RepositoryAssociator
				error={repoAssociationError}
				onCancelled={e => {
					exit();
				}}
				onSubmit={r => {
					const payload = {
						url: r.remote,
						name: r.name,
						entityId: pendingEntityId,
						errorGroupGuid: codeError?.objectId || pendingErrorGroupGuid!,
						parseableAccountId: codeError?.objectId || pendingErrorGroupGuid!
					};
					dispatch(api("assignRepository", payload)).then(_ => {
						setIsLoading(true);
						if (_?.directives) {
							console.log("assignRepository", {
								directives: _?.directives
							});
							setRepoAssociationError(undefined);
							onConnected(_.directives.find(_ => _.type === "assignRepository").data.repo.urls[0]);
						} else {
							console.log("Could not find directive", {
								payload: payload
							});
							setError({
								title: "Failed to associate repository",
								description: _?.error
							});
						}
					});
				}}
			/>
		);
	}

	if (requiresConnection) {
		return (
			<Root>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						width: "100%"
					}}
				>
					<div
						style={{ marginLeft: "auto", marginRight: "13px", whiteSpace: "nowrap", flexGrow: 0 }}
					>
						<Icon
							className="clickable"
							name="x"
							onClick={exit}
							title="Close View"
							placement="bottomRight"
							delay={1}
						/>
					</div>
				</div>

				<div className="embedded-panel">
					<ConfigureNewRelic
						headerChildren={
							<>
								<div className="panel-header" style={{ background: "none" }}>
									<span className="panel-title">Connect to New Relic</span>
								</div>
								<div style={{ textAlign: "center" }}>
									Working with errors requires a connection to your New Relic account.
								</div>
							</>
						}
						disablePostConnectOnboarding={true}
						showSignupUrl={false}
						providerId={"newrelic*com"}
						onClose={e => {
							dispatch(closeAllPanels());
						}}
						onSubmited={async e => {
							onConnected();
						}}
					/>
				</div>
			</Root>
		);
	}
	if (isLoading) {
		return (
			<DelayedRender>
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<LoadingMessage>Loading Error Group...</LoadingMessage>
				</div>
			</DelayedRender>
		);
	}
	if (codeError == null) return null;

	return (
		<Root>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					width: "100%"
				}}
			>
				{/* <div
					style={{
						width: "1px",
						height: "16px",
						background: "var(--base-border-color)",
						display: "inline-block",
						margin: "0 10px 0 0",
						flexGrow: 0
					}}
				/> */}
				<div style={{ marginLeft: "auto", marginRight: "13px", whiteSpace: "nowrap", flexGrow: 0 }}>
					<Icon
						className="clickable"
						name="x"
						onClick={exit}
						title="Close View"
						placement="bottomRight"
						delay={1}
					/>
				</div>
			</div>

			<>
				<NavHeader id="nav-header">
					<BaseCodeErrorHeader
						codeError={codeError!}
						errorGroup={errorGroup}
						collapsed={false}
						setIsEditing={setIsEditing}
					></BaseCodeErrorHeader>
				</NavHeader>
				{props.composeOpen ? null : (
					<div className="scroll-container">
						<ScrollBox>
							<div
								className="vscroll"
								id="code-error-container"
								style={{
									padding: "0 20px 60px 40px",
									width: "100%"
								}}
							>
								{/* TODO perhaps consolidate these? */}
								{(repoError || repoWarning) && !derivedState.demoMode && (
									<CodeErrorErrorBox>
										<Icon name="alert" className="alert" />
										<div className="message">
											{(
												(repoWarning || "") +
												(repoError ? `${repoWarning ? "\n" : ""}${repoError}` : "")
											)
												.split("\n")
												.map(function(item, key) {
													return (
														<div key={"warningOrError_" + key}>
															{item}
															<br />
														</div>
													);
												})}
										</div>
									</CodeErrorErrorBox>
								)}

								<StyledCodeError className="pulse">
									<CodeError
										parsedStack={parsedStack}
										codeError={codeError!}
										errorGroup={errorGroup}
										stackFrameClickDisabled={!!repoError}
									/>
								</StyledCodeError>
							</div>
						</ScrollBox>
					</div>
				)}
			</>
		</Root>
	);
}
