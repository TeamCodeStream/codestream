import { isSha } from "@codestream/webview/utilities/strings";
import React from "react";
import { useEffect } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { closeAllPanels, setCurrentCodeError } from "@codestream/webview/store/context/actions";
import { useDidMount, usePrevious } from "@codestream/webview/utilities/hooks";
import {
	addCodeErrors,
	updateCodeError,
	api,
	fetchCodeError,
	fetchErrorGroup,
	openErrorGroup,
	PENDING_CODE_ERROR_ID_PREFIX,
	resolveStackTrace,
	setErrorGroup
} from "@codestream/webview/store/codeErrors/actions";
import { CodeStreamState } from "../store";
import { getCodeError, getErrorGroup } from "../store/codeErrors/reducer";
import { Meta, BigTitle, Header } from "./Codemark/BaseCodemark";
import { closePanel, markItemRead } from "./actions";
import { Dispatch } from "../store/common";
import { CodeError, BaseCodeErrorHeader, ExpandedAuthor, Description, Message } from "./CodeError";
import ScrollBox from "./ScrollBox";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { setUserPreference } from "./actions";
import Icon from "./Icon";
import { isConnected } from "../store/providers/reducer";
import { ConfigureNewRelic } from "./ConfigureNewRelic";
import Dismissable from "./Dismissable";
import { bootstrapCodeErrors } from "@codestream/webview/store/codeErrors/actions";
import { DelayedRender } from "../Container/DelayedRender";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { Button } from "../src/components/Button";
import { TourTip } from "../src/components/TourTip";
import { ComposeArea, ClearModal, Subtext, Step, Tip } from "./ReviewNav";
import {
	GetNewRelicErrorGroupRequestType,
	ResolveStackTraceResponse,
	MatchReposRequestType,
	MatchReposResponse,
	NewRelicErrorGroup,
	NormalizeUrlRequestType,
	NormalizeUrlResponse,
	WarningOrError,
	GetNewRelicErrorGroupResponse
} from "@codestream/protocols/agent";
import { HostApi } from "..";
import { CSCodeError } from "@codestream/protocols/api";
import { RepositoryAssociator } from "./CodeError/RepositoryAssociator";
import { logWarning } from "../logger";
import { Link } from "./Link";
import { getSidebarLocation } from "../store/editorContext/reducer";

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

export const StyledCodeError = styled.div``;

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
	#stack-trace {
		transition: opacity 0.2s;
	}
	.pulse #stack-trace {
		opacity: 1;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		background: var(--app-background-color-hover);
	}

	#resolution {
		transition: opacity 0.2s;
	}

	.pulse #resolution {
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

const ShowInstructionsContainer = styled.div`
	margin-top: 50px;
	float: right;
	cursor: pointer;
	font-size: smaller;
	opacity: 0.5;
`;

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
			hideCodeErrorInstructions: state.preferences.hideCodeErrorInstructions,
			codeError: codeError,
			currentCodemarkId: state.context.currentCodemarkId,
			isConnectedToNewRelic: isConnected(state, { id: "newrelic*com" }),
			errorGroup: errorGroup,
			repos: state.repos,
			sidebarLocation: getSidebarLocation(state)
		};
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
	const [multiRepoDetectedError, setMultiRepoDetectedError] = React.useState<
		{ title: string; description: string } | undefined
	>(undefined);
	const [repoWarning, setRepoWarning] = React.useState<WarningOrError | undefined>(undefined);
	const [repoError, setRepoError] = React.useState<string | undefined>(undefined);
	const { errorGroup } = derivedState;
	const [isResolved, setIsResolved] = React.useState(false);
	const [parsedStack, setParsedStack] = React.useState<ResolveStackTraceResponse | undefined>(
		undefined
	);
	const [hoverButton, setHoverButton] = React.useState(
		derivedState.hideCodeErrorInstructions ? "" : "stacktrace"
	);

	// TODO rename these "pending" properties -- they might _always_ be pending creation
	const pendingErrorGroupGuid = derivedState.currentCodeErrorData?.pendingErrorGroupGuid;
	const pendingEntityId = derivedState.currentCodeErrorData?.pendingEntityId;
	const occurrenceId = derivedState.currentCodeErrorData?.occurrenceId;
	const remote = derivedState.currentCodeErrorData?.remote;
	const ref = derivedState.currentCodeErrorData?.commit || derivedState.currentCodeErrorData?.tag;
	const multipleRepos = derivedState.currentCodeErrorData?.multipleRepos;
	const sidebarLocation = derivedState.sidebarLocation;
	const claimWhenConnected = derivedState.currentCodeErrorData?.claimWhenConnected;

	const previousIsConnectedToNewRelic = usePrevious(derivedState.isConnectedToNewRelic);

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
		if (derivedState.codeError && unreadEnabled)
			dispatch(markItemRead(derivedState.codeError.id, derivedState.codeError.numReplies || 0));
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
			onConnected(undefined);
		} else {
			const onDidMount = () => {
				if (derivedState.codeError) {
					onConnected(derivedState.codeError);
					markRead();
				} else {
					dispatch(fetchCodeError(derivedState.currentCodeErrorId!))
						.then(_ => {
							if (!_ || !_.payload.length) {
								setError({
									title: "Cannot open Code Error",
									description:
										"This code error was not found. Perhaps it was deleted by the author, or you don't have permission to view it."
								});
							} else {
								onConnected(_.payload[0]);
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
		if (
			!derivedState.codeError ||
			!derivedState.codeError.objectId ||
			!derivedState.isConnectedToNewRelic ||
			errorGroup
		) {
			return;
		}

		setIsLoading(true);
		dispatch(fetchErrorGroup(derivedState.codeError)).then(_ => {
			setIsLoading(false);
		});
	}, [derivedState.codeError, derivedState.isConnectedToNewRelic, errorGroup]);

	const onConnected = async (
		codeErrorArg: CSCodeError | undefined,
		newRemote?: string,
		isConnected?: boolean
	) => {
		console.log("onConnected starting...");

		// don't always have the codeError from the state
		// sometimes we have to load it here (happens when you load the IDE with an existing codeError open)
		const codeError = codeErrorArg || derivedState.codeError;
		let isExistingCodeError;

		let errorGroupGuidToUse: string | undefined;
		let occurrenceIdToUse: string | undefined;
		let refToUse: string | undefined;
		let entityIdToUse: string | undefined;

		if (claimWhenConnected) {
			// we get here if the code error is not yet claimed by the current team,
			// in which case we need to circle back and "reopen" it again
			dispatch(closeAllPanels());
			return dispatch(openErrorGroup(pendingErrorGroupGuid!, occurrenceId));
		} else if (pendingErrorGroupGuid) {
			errorGroupGuidToUse = pendingErrorGroupGuid;
			occurrenceIdToUse = occurrenceId;
			refToUse = ref;
			entityIdToUse = pendingEntityId;
		} else if (codeError) {
			isExistingCodeError = true;
			errorGroupGuidToUse = codeError?.objectId;

			const existingStackTrace =
				codeError.stackTraces && codeError.stackTraces[0] ? codeError.stackTraces[0] : undefined;
			if (existingStackTrace) {
				occurrenceIdToUse = existingStackTrace.occurrenceId;
				refToUse = existingStackTrace.sha;
			}
			entityIdToUse = codeError?.objectInfo?.entityId;
		}
		if (!errorGroupGuidToUse) {
			console.error("missing error group guid");
			return;
		}

		console.log(`onConnected started isExistingCodeError=${isExistingCodeError}`);
		if (
			previousIsConnectedToNewRelic === false &&
			(derivedState.isConnectedToNewRelic || isConnected)
		) {
			setIsLoading(true);
		}
		setRepoAssociationError(undefined);
		setMultiRepoDetectedError(undefined);
		setError(undefined);

		try {
			let errorGroupResult: GetNewRelicErrorGroupResponse | undefined = undefined;
			if (isConnected || derivedState.isConnectedToNewRelic) {
				errorGroupResult = await HostApi.instance.send(GetNewRelicErrorGroupRequestType, {
					errorGroupGuid: errorGroupGuidToUse,
					occurrenceId: occurrenceIdToUse,
					entityGuid: entityIdToUse,
					timestamp: derivedState.currentCodeErrorData?.timestamp
				});

				if (!errorGroupResult || errorGroupResult?.error?.message) {
					setError({
						title: "Unexpected Error",
						description: errorGroupResult?.error?.message || "unknown error",
						details: errorGroupResult?.error?.details
					});
					return;
				}
			}

			let repoId: string | undefined = undefined;
			let stackInfo: ResolveStackTraceResponse | undefined = undefined;
			let targetRemote;
			const hasStackTrace =
				errorGroupResult?.errorGroup?.hasStackTrace || !!codeError?.stackTraces?.length;
			if (!hasStackTrace) {
				setIsResolved(true);
				setRepoWarning({ message: "There is no stack trace associated with this error." });
			} else {
				if (errorGroupResult?.errorGroup?.entity?.relationship?.error?.message != null) {
					setError({
						title: "Repository Relationship Error",
						// @ts-ignore
						description: errorGroupResult.errorGroup.entity.relationship.error.message!
					});
					return;
				}

				targetRemote = newRemote || remote;
				if (multipleRepos && !targetRemote && derivedState.isConnectedToNewRelic) {
					setMultiRepoDetectedError({
						title: "Select a Repository",
						description: `The ${
							errorGroup ? errorGroup.entityName + " " : "selected "
						}stack trace is associated with multiple repositories. Please select the one required for investigating this error.`
					});
					return;
				}

				if (errorGroupResult?.errorGroup?.entity?.repo?.urls != null) {
					targetRemote = errorGroupResult?.errorGroup?.entity?.repo?.urls[0]!;
				} else if (codeError?.objectInfo?.remote) {
					targetRemote = codeError?.objectInfo?.remote;
				}
				if (!targetRemote) {
					if (derivedState.isConnectedToNewRelic) {
						setRepoAssociationError({
							title: "Missing Repository Info",
							description: `In order to view this stack trace, please select a repository to associate with ${
								errorGroup ? errorGroup.entityName + " " : ""
							}on New Relic. If the repo that was used to build this service doesn't appear in the dropdown, open it in your IDE.`
						});
						return;
					}
				}

				if (targetRemote) {
					// we have a remote, try to find a repo.
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
								knownCommitHashes: refToUse && isSha(refToUse) ? [refToUse] : []
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
					repoId = reposResponse.repos[0].id!;
				}
				if (!repoId) {
					// no targetRemote, try to get a repo from existing stackTrace
					repoId =
						codeError?.stackTraces && codeError?.stackTraces.length > 0
							? codeError.stackTraces[0].repoId
							: "";
				}
				// YUCK
				const stack =
					errorGroupResult?.errorGroup?.errorTrace?.stackTrace?.map(_ => _.formatted) ||
					(codeError?.stackTraces && codeError.stackTraces.length > 0
						? codeError.stackTraces[0].text?.split("\n")
						: []);

				if (stack) {
					stackInfo = (await resolveStackTrace(
						errorGroupGuidToUse!,
						repoId!,
						refToUse!,
						occurrenceIdToUse!,
						stack!,
						derivedState.currentCodeErrorId!
					)) as ResolveStackTraceResponse;
				}
			}

			if (errorGroupResult && errorGroupResult.errorGroup != null) {
				dispatch(setErrorGroup(errorGroupGuidToUse, errorGroupResult.errorGroup!));
			}

			const actualStackInfo = stackInfo
				? stackInfo.error
					? [{ ...stackInfo, lines: [] }]
					: [stackInfo.parsedStackInfo!]
				: [];

			if (errorGroupResult) {
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
								objectId: errorGroupGuidToUse,
								objectType: "errorGroup",
								title: errorGroupResult.errorGroup?.title || "",
								text: errorGroupResult.errorGroup?.message || undefined,
								// storing the permanently parsed stack info
								stackTraces: actualStackInfo,
								objectInfo: {
									repoId: repoId!,
									remote: targetRemote,
									accountId: errorGroupResult.accountId.toString(),
									entityId: errorGroupResult?.errorGroup?.entityGuid || "",
									entityName: errorGroupResult?.errorGroup?.entityName || ""
								}
							}
						])
					);
				} else if (derivedState.codeError && !derivedState.codeError.objectInfo) {
					// codeError has an currentCodeErrorId, but isn't pending... it also doesn't have an objectInfo,
					// so update it with one
					await dispatch(
						updateCodeError({
							...derivedState.codeError,
							accountId: errorGroupResult.accountId,
							title: errorGroupResult.errorGroup?.title || "",
							text: errorGroupResult.errorGroup?.message || undefined,
							// storing the permanently parsed stack info
							stackTraces: actualStackInfo,
							objectInfo: {
								repoId: repoId,
								remote: targetRemote,
								accountId: errorGroupResult.accountId.toString(),
								entityId: errorGroupResult?.errorGroup?.entityGuid || "",
								entityName: errorGroupResult?.errorGroup?.entityName || ""
							}
						})
					);
				}
			}
			if (stackInfo) {
				setParsedStack(stackInfo);
				setRepoError(stackInfo.error);
				setRepoWarning(stackInfo.warning);
			}

			setIsResolved(true);

			let trackingData = {
				"Error Group ID": errorGroupResult?.errorGroup?.guid || codeError?.objectInfo?.entityId,
				"NR Account ID": errorGroupResult?.accountId || codeError?.objectInfo?.accountId || "0",
				"Entry Point": derivedState.currentCodeErrorData?.openType || "Open in IDE Flow",
				"Stack Trace": !!(stackInfo && !stackInfo.error)
			};
			if (trackingData["Stack Trace"]) {
				trackingData["Build ref"] = !refToUse
					? "Missing"
					: stackInfo?.warning
					? "Warning"
					: "Populated";
			}
			HostApi.instance.track("Error Opened", trackingData);
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
		return true;
	};

	const tryBuildWarningsOrErrors = () => {
		if (derivedState.demoMode) return null;

		const items: WarningOrError[] = [];
		if (repoError) {
			items.push({ message: repoError });
		}
		if (repoWarning) {
			items.push(repoWarning);
		}

		if (!items.length) return null;

		return (
			<CodeErrorErrorBox>
				<Icon name="alert" className="alert" />
				<div className="message">
					{items.map(_ => {
						const split = _.message.split("\n");

						return split.map((item, index) => {
							const templateRe = /(.*)\[(.+)\](.*)/g;
							const match = templateRe.exec(item);
							if (match != null) {
								const [, pre, linkText, post] = match;
								return (
									<div key={"warningOrError_" + index}>
										{pre}
										<Link href={_.helpUrl!}>{linkText}</Link>
										{post}
									</div>
								);
							} else {
								return (
									<div key={"warningOrError_" + index}>
										{item}
										{_.helpUrl && split.length - 1 === index && (
											<>
												{" "}
												<Link href={_.helpUrl!}>Learn more</Link>
											</>
										)}
										<br />
									</div>
								);
							}
						});
					})}
				</div>
			</CodeErrorErrorBox>
		);
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

	const toggleInstructions = () => {
		dispatch(
			setUserPreference(["hideCodeErrorInstructions"], !derivedState.hideCodeErrorInstructions)
		);
	};

	const tourDone = () => {
		setHoverButton("");
		toggleInstructions();
	};

	const stackTraceTip =
		hoverButton === "stacktrace" ? (
			<Tip>
				<Step>1</Step>
				<div>
					Investigate the stack trace
					<Subtext>By clicking on each frame to go to the specific file and line number</Subtext>
					<Button onClick={() => setHoverButton("comment")}>Next &gt;</Button>
				</div>
			</Tip>
		) : (
			undefined
		);

	const commentTip =
		hoverButton === "comment" ? (
			<Tip>
				<Step>2</Step>
				<div>
					Comment by selecting code in the editor
					<Subtext>CodeStream will automatically mention the code author</Subtext>
					<Button
						onClick={() => {
							const el = document.getElementById("code-error-nav-header");
							if (el) el.scrollIntoView(true);
							setHoverButton("resolution");
						}}
					>
						Next &gt;
					</Button>
				</div>
			</Tip>
		) : (
			undefined
		);

	const resolutionTip =
		hoverButton === "resolution" ? (
			<Tip>
				<Step>3</Step>
				<div>
					Resolve or ignore the error
					<Subtext>Once the investigation is complete</Subtext>
					<Button onClick={tourDone}>Done</Button>
				</div>
			</Tip>
		) : (
			undefined
		);

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
	if (multiRepoDetectedError) {
		return (
			<RepositoryAssociator
				error={multiRepoDetectedError}
				buttonText={"Select"}
				onCancelled={e => {
					exit();
				}}
				onSubmit={r => {
					return new Promise((resolve, reject) => {
						const payload = {
							url: r.remote,
							errorGroupGuid: derivedState.codeError?.objectId || pendingErrorGroupGuid!
						};
						HostApi.instance.track("NR Multi Repo Selected", {
							"Error Group ID": payload.errorGroupGuid
						});
						onConnected(undefined, r.remote);
					});
				}}
			/>
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
					return new Promise((resolve, reject) => {
						const payload = {
							url: r.remote,
							name: r.name,
							entityId: pendingEntityId,
							errorGroupGuid: derivedState.codeError?.objectId || pendingErrorGroupGuid!,
							parseableAccountId: derivedState.codeError?.objectId || pendingErrorGroupGuid!
						};
						dispatch(api("assignRepository", payload)).then(_ => {
							setIsLoading(true);
							if (_?.directives) {
								console.log("assignRepository", {
									directives: _?.directives
								});
								setRepoAssociationError(undefined);
								resolve(true);

								HostApi.instance.track("NR Repo Association", {
									"Error Group ID": payload.errorGroupGuid
								});

								onConnected(
									undefined,
									_.directives.find(_ => _.type === "assignRepository").data.repo.urls[0]
								);
							} else {
								console.log("Could not find directive", {
									payload: payload
								});
								resolve(true);

								setError({
									title: "Failed to associate repository",
									description: _?.error
								});
							}
						});
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
						onSubmited={e => {
							return onConnected(undefined, undefined, true);
						}}
						originLocation={"Open in IDE Flow"}
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
	if (derivedState.codeError == null) return null;

	return (
		<Root
			id="code-error-nav-header"
			className={derivedState.hideCodeErrorInstructions ? "" : "tour-on"}
		>
			{!derivedState.hideCodeErrorInstructions && <ClearModal onClick={() => tourDone()} />}
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
			<NavHeader id="nav-header">
				<BaseCodeErrorHeader
					codeError={derivedState.codeError!}
					errorGroup={errorGroup}
					collapsed={false}
					setIsEditing={setIsEditing}
					resolutionTip={resolutionTip}
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
							{tryBuildWarningsOrErrors()}

							<StyledCodeError className={hoverButton == "stacktrace" ? "pulse" : ""}>
								<CodeError
									parsedStack={parsedStack}
									codeError={derivedState.codeError!}
									errorGroup={errorGroup}
									stackFrameClickDisabled={!!repoError}
									stackTraceTip={stackTraceTip}
								/>
							</StyledCodeError>
							{derivedState.hideCodeErrorInstructions && (
								<ShowInstructionsContainer>
									<span
										onClick={() => {
											setHoverButton("stacktrace");
											toggleInstructions();
										}}
									>
										Show Instructions
									</span>
								</ShowInstructionsContainer>
							)}
						</div>
					</ScrollBox>
				</div>
			)}
			<TourTip title={commentTip} placement={sidebarLocation === "right" ? "right" : "left"}>
				<ComposeArea
					side={sidebarLocation === "right" ? "right" : "left"}
					className={hoverButton == "comment" ? "pulse" : ""}
				/>
			</TourTip>
		</Root>
	);
}
