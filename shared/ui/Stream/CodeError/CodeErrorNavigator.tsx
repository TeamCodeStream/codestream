import {
	GetNewRelicErrorGroupResponse,
	MatchReposRequestType,
	NormalizeUrlRequestType,
	ResolveStackTraceRequest,
	ResolveStackTraceResponse,
	TelemetryData,
	WarningOrError,
} from "@codestream/protocols/agent";
import { CSStackTraceInfo } from "@codestream/protocols/api";

import { removeCodeError, resetNrAi } from "@codestream/webview/store/codeErrors/actions";
import {
	addAndEnhanceCodeError,
	api,
	fetchErrorGroup,
	fetchNewRelicErrorGroup,
	resolveStackTrace,
	setErrorGroup,
} from "@codestream/webview/store/codeErrors/thunks";
import { setCurrentCodeErrorData } from "@codestream/webview/store/context/actions";
import { closeAllPanels } from "@codestream/webview/store/context/thunks";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import styled from "styled-components";
import { DelayedRender } from "../../Container/DelayedRender";
import { logError, logWarning } from "../../logger";
import { Button } from "../../src/components/Button";
import { LoadingMessage } from "../../src/components/LoadingMessage";
import { TourTip } from "../../src/components/TourTip";
import { CodeStreamState } from "../../store";
import { isFeatureEnabled } from "../../store/apiVersioning/reducer";
import { getCodeError, getErrorGroup } from "../../store/codeErrors/reducer";
import { getSidebarLocation } from "../../store/editorContext/reducer";
import KeystrokeDispatcher from "../../utilities/keystroke-dispatcher";
import { markItemRead, setUserPreference } from "../actions";
import { Description, ExpandedAuthor } from "./CodeError.Types";
import { CodeErrorHeader } from "./CodeErrorHeader";
import { RepositoryAssociator } from "./RepositoryAssociator";
import { BigTitle, Header, Meta } from "../Codemark/BaseCodemark";
import Dismissable from "../Dismissable";
import { Icon } from "../Icon";
import { ClearModal, Step, Subtext, Tip } from "../ReviewNav";
import { ScrollBox } from "../ScrollBox";
import { WarningBox } from "../WarningBox";
import { isEmpty as _isEmpty } from "lodash";
import { isSha } from "@codestream/webview/utilities/strings";
import { parseId } from "@codestream/webview/utilities/newRelic";
import { confirmPopup } from "@codestream/webview/Stream/Confirm";
import { NotificationBox } from "../NotificationBox";
import { CodeError } from "./CodeError";

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

	.resolution {
		transition: opacity 0.2s;
	}

	.pulse .resolution {
		opacity: 1;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		background: var(--app-background-color-hover);
		padding: 5px;
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

const ShowInstructionsContainer = styled.div`
	margin-top: 50px;
	float: right;
	cursor: pointer;
	font-size: smaller;
	opacity: 0.5;
`;

export type Props = React.PropsWithChildren<{ composeOpen: boolean }>;

/**
 * Called from InlineCodemarks it is what allows the commenting on lines of code
 *
 * @export
 * @param {Props} props
 * @return {*}
 */
export function CodeErrorNavigator(props: Props) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const codeError = state.context.currentCodeErrorGuid
			? getCodeError(state.codeErrors, state.context.currentCodeErrorGuid)
			: undefined;
		const errorGroup = getErrorGroup(state.codeErrors, codeError);
		const discussion = state.codeErrors.discussion;

		const result = {
			codeErrorDiscussion: discussion,
			demoMode: state.preferences.demoMode,
			errorsDemoMode: state.codeErrors.demoMode,
			codeErrorStateBootstrapped: state.codeErrors.bootstrapped,
			currentCodeErrorGuid: state.context.currentCodeErrorGuid,
			currentCodeErrorData: state.context.currentCodeErrorData,
			currentMethodLevelTelemetry: state.context.currentMethodLevelTelemetry,
			currentObservabilityAnomaly: state.context.currentObservabilityAnomaly,
			sessionStart: state.context.sessionStart,
			hideCodeErrorInstructions: true, // TODO NR-295770 fix and revert
			codeError: codeError,
			currentCodemarkId: state.context.currentCodemarkId,
			errorGroup: errorGroup,
			currentEntityGuid: state.context.currentEntityGuid,
			repos: state.repos,
			sidebarLocation: getSidebarLocation(state),
		};
		return result;
	}, shallowEqual);

	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<
		{ title?: string; description: string; details?: any } | undefined
	>(undefined);

	const [repoAssociationError, setRepoAssociationError] = useState<
		{ title: string; description: string } | undefined
	>(undefined);
	const [multiRepoDetectedError, setMultiRepoDetectedError] = useState<
		{ title: string; description: string } | undefined
	>(undefined);
	const [repoNotification, setRepoNotification] = useState<WarningOrError | undefined>(undefined);
	const [repoWarning, setRepoWarning] = useState<WarningOrError | undefined>(undefined);
	const [repoError, setRepoError] = useState<string | undefined>(undefined);
	const { errorGroup } = derivedState;
	const [isResolved, setIsResolved] = useState(false);
	const [parsedStack, setParsedStack] = useState<ResolveStackTraceResponse | undefined>(undefined);
	const [hoverButton, setHoverButton] = useState(
		derivedState.hideCodeErrorInstructions ? "" : "stacktrace"
	);

	const occurrenceId = derivedState.currentCodeErrorData?.occurrenceId;
	const remote = derivedState.currentCodeErrorData?.remote;
	const ref = derivedState.currentCodeErrorData?.commit || derivedState.currentCodeErrorData?.tag;
	const multipleRepos = derivedState.currentCodeErrorData?.multipleRepos;
	const sidebarLocation = derivedState.sidebarLocation;

	const exit = async () => {
		// clear out the current code error (set to blank) in the webview
		if (derivedState.errorsDemoMode.enabled) {
			if (derivedState.currentCodeErrorGuid) {
				// dispatch(deletePost(derivedState.currentCodeErrorData.postId!));
				dispatch(removeCodeError(derivedState.currentCodeErrorGuid));
			}
		}
		await dispatch(setCurrentCodeErrorData());
	};

	const unreadEnabled = useSelector((state: CodeStreamState) =>
		isFeatureEnabled(state, "readItem")
	);

	const markRead = () => {
		if (derivedState.codeError && unreadEnabled)
			dispatch(
				markItemRead(derivedState.codeError.entityGuid, derivedState.codeError.numReplies || 0)
			);
	};

	useEffect(() => {
		if (
			derivedState.sessionStart &&
			derivedState.currentCodeErrorData?.sessionStart &&
			derivedState.currentCodeErrorData?.sessionStart !== derivedState.sessionStart
		) {
			logWarning("preventing reload from creating a codeError, sessionStart mismatch", {
				currentCodeErrorDataSessionStart: derivedState.currentCodeErrorData?.sessionStart,
				sessionStart: derivedState.sessionStart,
			});
			dispatch(setCurrentCodeErrorData());
			dispatch(closeAllPanels());
			return;
		}

		const onDidMount = () => {
			onConnected();
			markRead();
		};
		onDidMount();
	}, [derivedState.currentCodeErrorGuid]);

	useEffect(() => {
		if (!derivedState.codeError || !derivedState.codeError.entityGuid || errorGroup) {
			return;
		}

		setIsLoading(true);
		dispatch(
			fetchErrorGroup({
				codeError: derivedState.codeError,
				entityGuid: derivedState.currentEntityGuid,
			})
		);
	}, [derivedState.codeError, errorGroup]);

	const onConnected = async (newRemote?: string) => {
		console.log("onConnected starting...");

		const errorGroupGuidToUse = derivedState.currentCodeErrorGuid;
		const codeErrorData = derivedState.currentCodeErrorData;
		const occurrenceIdToUse = codeErrorData?.occurrenceId;
		let refToUse: string | undefined;
		const entityIdToUse =
			derivedState.codeError?.objectInfo?.entityId ?? derivedState.currentEntityGuid;
		const accountIdToUse = parseId(entityIdToUse!)?.accountId;

		if (!errorGroupGuidToUse) {
			console.error("missing error group guid");
			return;
		}

		setIsLoading(true);
		setRepoAssociationError(undefined);
		setMultiRepoDetectedError(undefined);
		setError(undefined);

		try {
			let errorGroupResult: GetNewRelicErrorGroupResponse | undefined = undefined;
			errorGroupResult = await dispatch(
				fetchNewRelicErrorGroup({
					errorGroupGuid: errorGroupGuidToUse,
					occurrenceId: occurrenceIdToUse,
					entityGuid: entityIdToUse,
					timestamp: codeErrorData?.timestamp,
				})
			).unwrap();

			if (!errorGroupResult || errorGroupResult?.error?.message) {
				const title = "Unexpected Error";
				const description = errorGroupResult?.error?.message || "unknown error";
				if (errorGroupResult?.error?.message === "Access denied.") {
					confirmPopup({
						title: "Error Can't Be Opened",
						message: "You do not have access to this error group.",
						centered: true,
						buttons: [
							{
								label: "OK",
								className: "control-button",
								action: _e => {
									dispatch(setCurrentCodeErrorData());
								}, // Close the code error discussion},
							},
						],
					});
				} else {
					setError({
						title,
						description,
						details: errorGroupResult?.error?.details,
					});
				}
				logError(`${title}, description: ${description}`, {
					currentCodeErrorGuid: derivedState.currentCodeErrorGuid!,
					errorGroupGuid: errorGroupGuidToUse,
					occurrenceId: occurrenceIdToUse,
					entityGuid: entityIdToUse,
					timestamp: codeErrorData?.timestamp,
				});
				return;
			}

			let repoId: string | undefined = undefined;
			let stackInfo: ResolveStackTraceResponse | undefined = undefined;
			let targetRemote;
			const hasStackTrace = errorGroupResult?.errorGroup?.hasStackTrace;

			if (errorGroupResult?.errorGroup?.entity?.relationship?.error?.message != null) {
				const title = "Repository Relationship Error";
				const description = errorGroupResult.errorGroup.entity.relationship.error.message!;
				setError({
					title,
					description,
				});
				logError(`${title}, description: ${description}`, {
					errorGroupGuid: errorGroupGuidToUse,
					occurrenceId: occurrenceIdToUse,
					entityGuid: entityIdToUse,
					timestamp: codeErrorData?.timestamp,
				});
				return;
			}

			targetRemote = newRemote ?? remote;
			const entityName = errorGroup?.entityName || "selected";

			if (multipleRepos && !targetRemote) {
				setMultiRepoDetectedError({
					title: "Select a Repository",
					description: `The ${entityName} service is associated with multiple repositories. Please select one to continue.`,
				});
				return;
			}

			// Set target remote if entity is associated with one repo
			if (errorGroupResult?.errorGroup?.entity?.relatedRepos?.length === 1 && !multipleRepos) {
				targetRemote = errorGroupResult?.errorGroup?.entity?.relatedRepos[0]?.url!;
			} else if (
				// Attempt to set remote from codeError object as long as we know there is a repo associated
				codeErrorData?.remote &&
				!_isEmpty(codeErrorData?.relatedRepos)
			) {
				targetRemote = codeErrorData?.remote;
			}

			// Kick off repo association screen
			if (!targetRemote) {
				setRepoAssociationError({
					title: "Which Repository?",
					description: `Select the repository that the ${entityName} service is associated with so that we can take you to the code. If the repository doesn't appear in the list, open it in your IDE.`,
				});

				return;
			}

			if (targetRemote) {
				// we have a remote, try to find a repo.
				const normalizationResponse = await HostApi.instance.send(NormalizeUrlRequestType, {
					url: targetRemote,
				});
				if (!normalizationResponse || !normalizationResponse.normalizedUrl) {
					const title = "Error";
					const description = `Could not find a matching repo for the remote ${targetRemote}`;
					setError({
						title: "Error",
						description: `Could not find a matching repo for the remote ${targetRemote}`,
					});
					logError(`${title}, description: ${description}`, {
						errorGroupGuid: errorGroupGuidToUse,
						occurrenceId: occurrenceIdToUse,
						entityGuid: entityIdToUse,
						targetRemote,
						timestamp: codeErrorData?.timestamp,
					});
					return;
				}

				const reposResponse = await HostApi.instance.send(MatchReposRequestType, {
					repos: [
						{
							remotes: [normalizationResponse.normalizedUrl],
							knownCommitHashes: refToUse && isSha(refToUse) ? [refToUse] : [],
						},
					],
				});

				if (reposResponse?.repos?.length === 0) {
					const title = "Repo Not Found";
					const description = `Please open the following repository: ${targetRemote}`;
					setError({
						title: "Repo Not Found",
						description: `Please open the following repository: ${targetRemote}`,
					});
					logError(`${title}, description: ${description}`, {
						errorGroupGuid: errorGroupGuidToUse,
						occurrenceId: occurrenceIdToUse,
						entityGuid: entityIdToUse,
						targetRemote,
						timestamp: codeErrorData?.timestamp,
					});

					return;
				}
				repoId = reposResponse.repos[0].id;
			}

			if (!hasStackTrace) {
				setIsResolved(true);
				setRepoWarning({ message: "There is no stack trace associated with this error." });
			} else {
				// YUCK
				const stack =
					errorGroupResult?.errorGroup?.errorTrace?.stackTrace?.map(_ => _.formatted) ?? [];

				if (!refToUse && errorGroupResult?.errorGroup) {
					refToUse = errorGroupResult.errorGroup.commit || errorGroupResult.errorGroup.releaseTag;
				}

				if (stack) {
					const request: ResolveStackTraceRequest = {
						entityGuid: entityIdToUse!,
						errorGroupGuid: errorGroupGuidToUse!,
						repoId: repoId!,
						ref: refToUse!,
						occurrenceId: occurrenceIdToUse!,
						stackTrace: stack!,
						codeErrorId: derivedState.currentCodeErrorGuid!,
						stackSourceMap: codeErrorData?.stackSourceMap,
						domain: codeErrorData?.domain!,
					};
					stackInfo = await dispatch(resolveStackTrace(request)).unwrap();
				}
			}

			if (errorGroupResult && errorGroupResult.errorGroup != null) {
				dispatch(setErrorGroup(errorGroupGuidToUse, errorGroupResult.errorGroup!));
			}

			const actualStackInfo: CSStackTraceInfo[] = stackInfo
				? stackInfo.error
					? [{ ...stackInfo, lines: [] }]
					: [stackInfo.parsedStackInfo!]
				: [];

			if (errorGroupResult && repoId) {
				if (derivedState.currentCodeErrorGuid) {
					await dispatch(
						addAndEnhanceCodeError({
							accountId: errorGroupResult.accountId,
							// these don't matter
							assignees: [],
							teamId: undefined,
							fileStreamIds: [],
							status: "open",
							numReplies: 0,
							lastActivityAt: 0,
							entityGuid: errorGroupGuidToUse,
							objectType: "errorGroup",
							title: errorGroupResult.errorGroup?.title || "",
							text: errorGroupResult.errorGroup?.message || undefined,
							// storing the permanently parsed stack info
							stackTraces: actualStackInfo,
							objectInfo: {
								repoId: repoId,
								remote: targetRemote,
								accountId: errorGroupResult.accountId.toString(),
								entityId: errorGroupResult?.errorGroup?.entityGuid,
								entityName: errorGroupResult?.errorGroup?.entityName,
								hasRelatedRepos: !_isEmpty(codeErrorData?.relatedRepos),
							},
						})
					);
				}
			}
			if (stackInfo) {
				setParsedStack(stackInfo);
				setRepoError(stackInfo.error);
				setRepoWarning(stackInfo.warning);
				setRepoNotification(stackInfo.notification);
			}

			setIsResolved(true);

			let trackingData = {
				entity_guid: entityIdToUse,
				account_id: errorGroupResult?.accountId,
				meta_data: `error_group_id: ${errorGroupResult?.errorGroup?.guid}`,

				meta_data_2: `entry_point: ${
					codeErrorData?.openType === "Observability Section"
						? "observability_section"
						: codeErrorData?.openType === "Activity Feed"
						? "activity_feed"
						: "open_in_ide"
				}`,
				meta_data_3: `stack_trace: ${!!(stackInfo && !stackInfo.error)}`,
				meta_data_4: `build_sha: missing`,
				event_type: "modal_display",
			} as TelemetryData;

			if (trackingData["meta_data_3"]) {
				trackingData["meta_data_4"] = !refToUse
					? "build_sha: missing"
					: stackInfo?.warning
					? "build_sha: warning"
					: "build_sha: populated";
			}
			HostApi.instance.track("codestream/errors/error_group displayed", trackingData);
		} catch (ex) {
			console.warn(ex);
			const title = "Unexpected Error";
			const description = ex.message ? ex.message : ex.toString();
			setError({
				title,
				description,
			});
			logError(`${title}, description: ${description}`, {
				errorGroupGuid: errorGroupGuidToUse,
				occurrenceId: occurrenceIdToUse,
				entityGuid: entityIdToUse,
			});
		} finally {
			setIsLoading(false);
		}
		return true;
	};

	const tryBuildNotification = () => {
		if (derivedState.demoMode || derivedState.errorsDemoMode.enabled) return null;

		const items: WarningOrError[] = [];
		if (repoNotification && !repoWarning) {
			items.push(repoNotification);
		}

		if (!items.length) return null;

		return <NotificationBox items={items} />;
	};

	const tryBuildWarningsOrErrors = () => {
		if (derivedState.demoMode || derivedState.errorsDemoMode.enabled) return null;

		const items: WarningOrError[] = [];
		if (repoError) {
			items.push({ message: repoError });
		}
		if (repoWarning) {
			items.push(repoWarning);
		}

		if (!items.length) return null;

		return <WarningBox items={items} />;
	};

	useDidMount(() => {
		// clear nrai states
		dispatch(resetNrAi());
		// Kind of a HACK leaving this here, BUT...
		// since <CancelButton /> uses the OLD version of Button.js
		// and not Button.tsx (below), there's no way to keep the style.
		// if Buttons can be consolidated, this could go away
		const disposable = KeystrokeDispatcher.onKeyDown(
			"Escape",
			event => {
				if (event.key === "Escape" && event.target.id !== "input-div") exit();
			},
			{ source: "CodeErrorNavigator.tsx", level: -1 }
		);

		return () => {
			disposable && disposable.dispose();
		};
	});

	const toggleInstructions = () => {
		dispatch(
			setUserPreference({
				prefPath: ["hideCodeErrorInstructions"],
				value: !derivedState.hideCodeErrorInstructions,
			})
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
		) : undefined;

	const resolutionTip =
		hoverButton === "resolution" ? (
			<Tip>
				<Step>2</Step>
				<div>
					More performance data!
					<Subtext>
						When you're done investigating this error, close it to see golden metrics, performance
						issues, logs, and more.
					</Subtext>
					<Button onClick={tourDone}>Done</Button>
				</div>
			</Tip>
		) : undefined;

	// if for some reason we have a codemark, don't render anything
	if (derivedState.currentCodemarkId) return null;

	if (error) {
		// essentially a roadblock
		logError(`${error?.title || "Error"}, Description: Internal Debugging Variables`, {
			currentCodeErrorGuid: derivedState.currentCodeErrorGuid!,
			errorGroupGuid: derivedState.codeError?.entityGuid,
			parseableAccountId: derivedState.codeError?.entityGuid,
			occurrenceId: occurrenceId,
			entityGuid: derivedState.codeError?.objectInfo?.entityId,
			timestamp: derivedState.currentCodeErrorData?.timestamp,
		});
		return (
			<Dismissable
				title={error.title || "Error"}
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							exit();
						},
					},
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
		const idInfo = derivedState.currentCodeErrorGuid
			? parseId(derivedState.currentCodeErrorGuid)
			: undefined;
		return (
			<RepositoryAssociator
				error={multiRepoDetectedError}
				buttonText={"Select"}
				onCancelled={e => {
					exit();
				}}
				isLoadingCallback={setIsLoading}
				isLoadingParent={isLoading}
				noSingleItemDropdownSkip={false}
				onSubmit={(r, skipTracking: boolean = false) => {
					setIsLoading(true);
					return new Promise((resolve, reject) => {
						if (!skipTracking) {
							HostApi.instance.track("codestream/repo_disambiguation succeeded", {
								event_type: "response",
								entity_guid: derivedState.currentEntityGuid,
								account_id: idInfo?.accountId,
								meta_data: "item_type: error",
								meta_data_2: `item_id: ${derivedState.currentCodeErrorGuid}`,
							});
						}
						onConnected(r.remote);
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
				isLoadingCallback={setIsLoading}
				isLoadingParent={isLoading}
				noSingleItemDropdownSkip={true}
				onSubmit={r => {
					return new Promise((resolve, reject) => {
						const payload = {
							url: r.remote,
							name: r.name,
							entityId: derivedState.codeError?.objectInfo?.entityId,
							errorGroupGuid: derivedState.currentCodeErrorGuid,
							parseableAccountId: derivedState.currentCodeErrorGuid,
						};
						dispatch(api("assignRepository", payload)).then(_ => {
							setIsLoading(true);
							if (_?.directives) {
								console.log("assignRepository", {
									directives: _?.directives,
								});
								setRepoAssociationError(undefined);
								resolve(true);
								const idInfo = derivedState.currentCodeErrorGuid
									? parseId(derivedState.currentCodeErrorGuid)
									: undefined;
								HostApi.instance.track("codestream/repo_association succeeded", {
									event_type: "response",
									entity_guid: derivedState.currentCodeErrorGuid,
									account_id: idInfo?.accountId,
									meta_data: "item_type: error",
									meta_data_2: `item_id: ${derivedState.currentCodeErrorGuid}`,
									meta_data_3: `entry_point: open_in_ide`,
								});

								let remoteForOnConnected;
								let repoFromAssignDirective = _.directives.find(
									_ => _.type === "assignRepository"
								).data;
								if (repoFromAssignDirective.repo?.relatedRepos?.length > 0) {
									remoteForOnConnected = repoFromAssignDirective.repo?.relatedRepos[0]?.url;
								} else {
									remoteForOnConnected = repoFromAssignDirective?.repo?.urls[0];
								}

								onConnected(remoteForOnConnected);
							} else {
								console.log("Could not find directive", {
									payload: payload,
								});
								resolve(true);
								const title = "Failed to associate repository";
								const description = _?.error;
								setError({
									title,
									description,
								});
								logError(`${title}, description: ${description}`, {
									url: r.remote,
									name: r.name,
									errorGroupGuid: derivedState.codeError?.entityGuid,
								});
							}
						});
					});
				}}
				telemetryOnDisplay={{
					accountId: derivedState.codeError?.accountId,
					entityGuid: derivedState.currentEntityGuid,
					itemType: "error",
					modalType: "repoAssociation",
				}}
			/>
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
					width: "100%",
				}}
			>
				<div
					className={hoverButton === "resolution" ? "pulse" : ""}
					style={{ marginLeft: "auto", marginRight: "13px", whiteSpace: "nowrap", flexGrow: 0 }}
				>
					<TourTip align={{ offset: [-10, 5] }} title={resolutionTip} placement="bottomLeft">
						<Icon
							className="clickable resolution"
							name="x"
							onClick={exit}
							title="Close View"
							placement="bottomRight"
							delay={1}
						/>
					</TourTip>
				</div>
			</div>

			<NavHeader id="nav-header">
				<CodeErrorHeader
					codeError={derivedState.codeError!}
					errorGroup={derivedState.errorGroup!}
					isCollapsed={false}
				></CodeErrorHeader>
			</NavHeader>

			{props.composeOpen ? null : (
				<div className="scroll-container">
					<ScrollBox>
						<div
							className="vscroll"
							id="code-error-container"
							style={{
								padding: "0 20px 60px 40px",
								width: "100%",
							}}
						>
							{tryBuildNotification()}
							{tryBuildWarningsOrErrors()}

							<StyledCodeError className={hoverButton == "stacktrace" ? "pulse" : ""}>
								<CodeError
									codeError={derivedState.codeError!}
									errorGroup={derivedState.errorGroup!}
									stackFrameClickDisabled={!!repoError}
									stackTraceTip={stackTraceTip}
									parsedStackTrace={parsedStack}
								/>
							</StyledCodeError>
						</div>
					</ScrollBox>
				</div>
			)}
		</Root>
	);
}
