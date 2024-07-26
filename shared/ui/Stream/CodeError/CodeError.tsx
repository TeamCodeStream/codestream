import {
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsRequestType,
	InitiateNrAiRequest,
	InitiateNrAiRequestType,
	NRErrorResponse,
	TelemetryData,
} from "@codestream/protocols/agent";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual } from "react-redux";
import { OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { CardFooter, getCardProps } from "@codestream/webview/src/components/Card";
import { TourTip } from "@codestream/webview/src/components/TourTip";
import { CodeStreamState } from "@codestream/webview/store";
import { copySymbolFromIde, jumpToStackLine } from "@codestream/webview/store/codeErrors/thunks";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import {
	LinkForExternalUrl,
	Meta,
	MetaDescription,
	MetaLabel,
	MetaSection,
	MinimumWidthCard,
} from "../Codemark/BaseCodemark";
import { Icon } from "../Icon";
import { DiscussionThread } from "../Discussions/DiscussionThread";
import Timestamp from "../Timestamp";
import Tooltip from "../Tooltip";
import { getNrCapability } from "@codestream/webview/store/nrCapabilities/thunks";
import { CommentInput } from "../Discussions/Comment";
import { DiscussionLoadingSkeleton } from "../Discussions/SkeletonLoader";
import {
	CodeErrorProps,
	ClickLines,
	DisabledClickLine,
	ClickLine,
	ComposeWrapper,
	Message,
	DataRow,
	DataLabel,
	DataValue,
} from "./CodeError.Types";
import { Loading } from "@codestream/webview/Container/Loading";
import { DelayedRender } from "@codestream/webview/Container/DelayedRender";
import { CSStackTraceLine } from "@codestream/protocols/api";
import { parseId } from "@codestream/webview/utilities/newRelic";
import {
	isNraiStreamLoading,
	resetDiscussions,
	setActiveDiscussion,
} from "@codestream/webview/store/discussions/discussionsSlice";
import useNraiStreaming from "@codestream/webview/Stream/CodeError/socks/useNraiStreaming";
import { setFunctionToEditFailed } from "@codestream/webview/store/codeErrors/actions";

export const CodeError = (props: CodeErrorProps) => {
	const dispatch = useAppDispatch();
	const streaming = useNraiStreaming();
	const footerRef = useRef<HTMLDivElement>(null);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const currentCodeErrorData = state.context.currentCodeErrorData;
		const parsed = parseId(currentCodeErrorData?.entityGuid);
		const discussion = state.discussions.activeDiscussion;
		const comments = discussion?.comments || [];
		const aiCommentParts = comments
			? comments.find(obj => obj.creator.name === "AI")?.parts
			: undefined;

		return {
			entityDomain: currentCodeErrorData?.domain,
			entityType: parsed?.type,
			traceId: currentCodeErrorData?.traceId,
			functionToEdit: state.codeErrors.functionToEdit,
			functionToEditFailed: state.codeErrors.functionToEditFailed,
			repos: state.repos,
			hideCodeErrorInstructions: state.preferences.hideCodeErrorInstructions,
			ideName: state.ide.name,
			grokNraiCapability: state.nrCapabilities.nrai === true,
			discussion,
			isNraiStreamLoading: isNraiStreamLoading(state),
			aiCommentParts,
		};
	}, shallowEqual);

	const {
		lines: stackTraceLines,
		text: stackTraceText,
		repoId,
		sha,
	} = { ...props.codeError?.stackTraces[0] };
	const { accountId, entityGuid, guid: errorGroupGuid } = { ...props.errorGroup };

	const [discussionError, setDiscussionError] = useState<string>();
	const [stackTraceError, setStackTraceError] = useState<string>();

	const [discussionIsLoading, setDiscussionIsLoading] = useState<boolean>(false);
	const [isNrAiLoading, setIsNrAiLoading] = useState<boolean>(false);
	const [nraiSubmitted, setNraiSubmitted] = useState<boolean>(false);
	const [stackTraceInitialized, setStackTraceInitialized] = useState<boolean>(false);
	const [currentNrAiFile, setCurrentNrAiFile] = useState<string | undefined>(undefined);
	const [selectedLineIndex, setSelectedLineIndex] = useState<number | undefined>(undefined);

	const { discussion } = derivedState;

	useDidMount(() => {
		dispatch(resetDiscussions());
		dispatch(getNrCapability("nrai"));
	});

	useEffect(() => {
		if (stackTraceInitialized) {
			return;
		}
		const stackTraceHasBeenResolved = stackTraceLines.every(_ => _.resolved !== undefined);

		if (stackTraceHasBeenResolved && !selectedLineIndex) {
			initializeStackTrace();
			scrollToStackTrace();
		}
	}, [{ ...Object.values(stackTraceLines) }]);

	const initializeStackTrace = () => {
		if (!stackTraceLines || stackTraceInitialized) {
			return;
		}
		setStackTraceInitialized(true);

		try {
			let foundNrAiLine: CSStackTraceLine | undefined = undefined;
			let foundNrAiLineIndex: number = -1;
			let foundLineIndex: number = -1;

			let lineIndex = 0;
			const lineCount = stackTraceLines.length || 0;

			while (lineIndex < lineCount) {
				const line = stackTraceLines[lineIndex];

				// skip lines that are not resolved
				if (!line.resolved) {
					lineIndex++;
					continue;
				}

				// find a method we can copy for AI usage
				if (
					line.method &&
					line.method !== "<unknown>" &&
					line.fileFullPath &&
					line.fileFullPath !== "<anonymous>"
				) {
					foundNrAiLine = line;
					foundNrAiLineIndex = lineIndex;
					break;
				}

				// find a line we can jump to in the IDE
				if (foundLineIndex >= 0) {
					foundLineIndex = lineIndex;
					break;
				}

				lineIndex++;
			}

			// we found what we need for NRAI, so use it for everything
			if (foundNrAiLine && foundNrAiLineIndex >= 0) {
				setCurrentNrAiFile(foundNrAiLine.fileFullPath);
				setSelectedLineIndex(foundNrAiLineIndex);

				dispatch(
					copySymbolFromIde({
						stackLine: foundNrAiLine,
						repoId,
					})
				).then(() => {
					dispatch(
						jumpToStackLine({
							lineIndex: foundNrAiLineIndex!,
							stackLine: foundNrAiLine!,
							repoId: repoId!,
						})
					);
				});
				return;
			}

			// we didn't find a method we can copy for AI usage, so just jump to the first line we can
			if (foundLineIndex >= 0) {
				setSelectedLineIndex(foundLineIndex);
				dispatch(
					jumpToStackLine({
						lineIndex: foundLineIndex!,
						stackLine: stackTraceLines[foundLineIndex!],
						repoId: repoId!,
						ref: sha,
					})
				);

				return;
			}

			// if we got this far, we weren't able to find anything useful, so set to failed
			// to let AI do its thing regardless
			dispatch(setFunctionToEditFailed(true));
		} catch (ex) {
			handleStackTraceError("An error occurred while attempting to process the stack trace.", ex);
			dispatch(setFunctionToEditFailed(true));
		}
	};

	const scrollToStackTrace = () => {
		requestAnimationFrame(() => {
			const $stackTrace = document.getElementById("stack-trace");
			if ($stackTrace) {
				$stackTrace.focus();
			}
		});
	};

	const useNrAi = useMemo(() => {
		return derivedState.grokNraiCapability;
	}, [derivedState.grokNraiCapability]);

	const repoName = useMemo(() => {
		if (!derivedState.repos || !repoId) {
			return undefined;
		}

		const repo = derivedState.repos[repoId];
		if (!repo) {
			return undefined;
		}

		return repo.name;
	}, [derivedState.repos, repoId]);

	const logError = (
		errorHandler: Function,
		message: string,
		params?: { error?: Error; nrError?: NRErrorResponse }
	) => {
		if (params && params.error) {
			console.error(params.error.message, params.error);
		} else if (params && params.nrError) {
			console.error(params.nrError.error.message, params.nrError);
		} else {
			console.error(message);
		}

		errorHandler(message);
	};

	const handleDiscussionError = (
		message: string,
		params?: { error?: Error; nrError?: NRErrorResponse }
	) => {
		logError(setDiscussionError, message, params);
	};

	const handleStackTraceError = (
		message: string,
		params?: { error?: Error; nrError?: NRErrorResponse }
	) => {
		logError(setStackTraceError, message, params);
	};

	useEffect(() => {
		if (!accountId || !entityGuid || !errorGroupGuid) {
			return;
		}

		loadDiscussion();
	}, [accountId, entityGuid, errorGroupGuid]);

	useEffect(() => {
		if (footerRef.current) {
			const footerElement = footerRef.current;
			if (footerElement) {
				footerElement.scrollIntoView({ behavior: "smooth", block: "end" });
				footerElement.scrollTop += 1000;
			}
		}
	}, [
		derivedState.isNraiStreamLoading,
		derivedState.aiCommentParts?.description,
		derivedState.aiCommentParts?.intro,
	]);

	useEffect(() => {
		// already going
		// we're already in the loading process
		// not watching these either, because once they're false, the next blocks for comment length should be sufficient.
		if (isNrAiLoading || derivedState.isNraiStreamLoading || nraiSubmitted) {
			return;
		}

		// discussion is no good
		if (!discussion || !discussion.threadId || discussion.comments.length > 0) {
			return;
		}

		// NRAI no good
		if (!useNrAi) {
			return;
		}

		if (derivedState.functionToEditFailed || derivedState.functionToEdit) {
			initializeNrAiAnalysis();
		}
	}, [discussion, useNrAi, derivedState.functionToEditFailed, derivedState.functionToEdit]);

	const initializeNrAiAnalysis = async () => {
		try {
			setIsNrAiLoading(true);
			if (nraiSubmitted) {
				return;
			}
			setNraiSubmitted(true);

			const initiateNrAiPayload: InitiateNrAiRequest = {
				errorGroupGuid: errorGroupGuid!,
				entityGuid: entityGuid!,
				threadId: discussion!.threadId,

				codeBlock: derivedState.functionToEdit?.codeBlock,
				stackTrace: stackTraceText ?? "",
				errorText: `${props.codeError.title} ${props.codeError?.text}`,
				language: derivedState.functionToEdit?.language,
			};

			// send the payload to the agent
			const response = await HostApi.instance.send(InitiateNrAiRequestType, initiateNrAiPayload);

			if (response.nrError) {
				handleDiscussionError("An error occurred while attempting to initiate NRAI.", {
					nrError: response.nrError,
				});
			} else {
				const payload = {
					event_type: "response",
				} as TelemetryData;

				HostApi.instance.track("codestream/nrai/error_analysis succeeded", payload);
			}
		} catch (ex) {
			handleDiscussionError("An error occurred while attempting to initiate NRAI.", {
				error: ex,
			});
		} finally {
			setIsNrAiLoading(false);
		}
	};

	const loadDiscussion = async () => {
		try {
			setDiscussionIsLoading(true);

			const payload: GetErrorInboxCommentsRequest = {
				errorGroupGuid: errorGroupGuid,
				entityGuid: entityGuid,
			};

			const response = await HostApi.instance.send(GetErrorInboxCommentsRequestType, payload);

			if (response.nrError) {
				handleDiscussionError(
					"An error occurred while attempting to load this error's discussion.",
					{
						nrError: response.nrError,
					}
				);
			} else {
				if (!response.threadId || !response.comments) {
					handleDiscussionError(
						"An error occurred while attempting to load this error's discussion.",
						{ error: new Error("Empty response") }
					);
					return;
				}
				dispatch(
					setActiveDiscussion({
						threadId: response.threadId,
						comments: response.comments,
					})
				);
			}
		} catch (ex) {
			handleDiscussionError("An error occurred while attempting to load this error's discussion.", {
				error: ex,
			});
		} finally {
			setDiscussionIsLoading(false);
		}
	};

	const openLogs = () => {
		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "logs",
			title: "Logs",
			entryPoint: "code_error",
			entityGuid: props.errorGroup?.entityGuid,
			traceId: derivedState.traceId,
			ide: {
				name: derivedState.ideName || undefined,
			},
		});
	};

	const onClickStackLine = (event: React.SyntheticEvent, lineIndex: number) => {
		event && event.preventDefault();

		if (
			stackTraceLines &&
			stackTraceLines[lineIndex] &&
			stackTraceLines[lineIndex].line !== undefined
		) {
			setSelectedLineIndex(lineIndex);

			const line = stackTraceLines[lineIndex];
			dispatch(
				jumpToStackLine({
					lineIndex: lineIndex,
					stackLine: line,
					repoId: repoId!,
					ref: sha,
				})
			);
		}
	};

	// TODO: implement keyboard navigation for stack trace lines
	// const handleKeyDown = event => {
	// 	if (!stackTraceLines || !stackTraceLines.length || !selectedLineIndex) {
	// 		return;
	// 	}

	// 	let nextLine = selectedLineIndex;
	// 	if (event.key === "ArrowUp" || event.which === 38) {
	// 		event.stopPropagation();
	// 		while (selectedLineIndex >= 0) {
	// 			nextLine--;
	// 			if (!stackTraceLines[nextLine].error) {
	// 				onClickStackLine(event, nextLine);
	// 				return;
	// 			}
	// 		}
	// 	}
	// 	if (event.key === "ArrowDown" || event.which === 40) {
	// 		event.stopPropagation();
	// 		while (selectedLineIndex <= stackTraceLines.length) {
	// 			nextLine++;
	// 			if (!stackTraceLines[nextLine].error) {
	// 				onClickStackLine(event, nextLine);
	// 				return;
	// 			}
	// 		}
	// 	}
	// };

	const renderLogsIcon = () => {
		if (!derivedState.traceId) {
			return null;
		}

		return (
			<Meta style={{ paddingBottom: "15px" }}>
				<LinkForExternalUrl
					href="#"
					onClick={e => {
						e.preventDefault();
					}}
				>
					<MetaDescription>
						<span
							onClick={e => {
								e.preventDefault();
								openLogs();
							}}
							style={{ opacity: 0.5 }}
						>
							<span>
								<Icon name="logs" />
							</span>
							View related logs
						</span>
					</MetaDescription>
				</LinkForExternalUrl>
			</Meta>
		);
	};

	const renderStackTraceLines = () => {
		return (
			<>
				{stackTraceError && (
					<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
						<h4>{stackTraceError}</h4>
					</div>
				)}

				{!stackTraceError && (
					<MetaSection>
						<Meta id="stack-trace">
							<MetaLabel>Stack Trace</MetaLabel>
							<TourTip placement="bottom">
								<ClickLines tabIndex={0} className="code">
									{(stackTraceLines || []).map((line, i) => {
										if (!line || !line.fileFullPath) return null;

										const className = i === selectedLineIndex ? "monospace li-active" : "monospace";
										const mline = line.fileFullPath.replace(/\s\s\s\s+/g, "     ");
										return !line.resolved || props.stackFrameClickDisabled ? (
											<Tooltip
												key={"tooltipline-" + i}
												title={line.error}
												placement="bottom"
												delay={1}
											>
												<DisabledClickLine key={"disabled-line" + i} className="monospace">
													<span>
														<span style={{ opacity: ".6" }}>{line.fullMethod}</span>({mline}:
														<strong>{line.line}</strong>
														{line.column ? `:${line.column}` : null})
													</span>
												</DisabledClickLine>
											</Tooltip>
										) : (
											<ClickLine
												key={"click-line" + i}
												className={className}
												onClick={e => onClickStackLine(e, i)}
											>
												<span>
													<span style={{ opacity: ".6" }}>{line.method}</span>({mline}:
													<strong>{line.line}</strong>
													{line.column ? `:${line.column}` : null})
												</span>
											</ClickLine>
										);
									})}
								</ClickLines>
							</TourTip>
						</Meta>
					</MetaSection>
				)}
			</>
		);
	};

	const renderStackTraceText = () => {
		return (
			<>
				{stackTraceError && (
					<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
						<h4>{stackTraceError}</h4>
					</div>
				)}

				{!stackTraceError && (
					<MetaSection>
						<Meta id="stack-trace">
							<MetaLabel>Stack Trace</MetaLabel>
							<TourTip placement="bottom">
								<ClickLines id="stack-trace" className="code" tabIndex={0}>
									{stackTraceText!.split("\n").map((line: string, i) => {
										if (!line) return null;
										const mline = line.replace(/\s\s\s\s+/g, "     ");
										return (
											<DisabledClickLine key={"disabled-line" + i} className="monospace">
												<span style={{ opacity: ".75" }}>{mline}</span>
											</DisabledClickLine>
										);
									})}
								</ClickLines>
							</TourTip>
						</Meta>
					</MetaSection>
				)}
			</>
		);
	};

	const renderFooter = () => {
		if (props.isCollapsed) {
			return null;
		}

		const footerClassName = derivedState.isNraiStreamLoading
			? "ai-loading replies-to-review"
			: "ai-not-loading replies-to-review";

		return (
			<div ref={footerRef}>
				{discussionError && (
					<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
						<h4>{discussionError}</h4>
					</div>
				)}

				<CardFooter className={footerClassName} style={{ borderTop: "none", marginTop: 0 }}>
					{!discussion && discussionIsLoading && (
						<DiscussionLoadingSkeleton></DiscussionLoadingSkeleton>
					)}

					{discussion && !discussionIsLoading && (
						<>
							{<MetaLabel>Discussion</MetaLabel>}

							<DiscussionThread
								file={currentNrAiFile}
								functionToEdit={derivedState.functionToEdit}
								isLoading={discussionIsLoading}
								errorGroup={props.errorGroup}
							/>

							<ComposeWrapper>
								<CommentInput
									threadId={discussion.threadId!}
									entityGuid={entityGuid}
									errorGroupGuid={errorGroupGuid}
									codeError={props.codeError}
									useNrAi={useNrAi}
									isLoading={discussionIsLoading}
								/>
							</ComposeWrapper>
						</>
					)}
				</CardFooter>
			</div>
		);
	};

	return (
		<>
			{(!props.codeError || !props.errorGroup) && (
				<DelayedRender>
					<Loading />
				</DelayedRender>
			)}

			<div ref={footerRef}>
				<MinimumWidthCard {...getCardProps(props)} noCard={!props.isCollapsed}>
					{props.codeError?.text && (
						<Message
							data-testid="code-error-text"
							style={{
								opacity: derivedState.hideCodeErrorInstructions ? "1" : ".25",
							}}
						>
							{props.codeError.text}
						</Message>
					)}

					<div
						style={{
							minHeight: props.errorGroup ? "18px" : "initial",
							opacity: derivedState.hideCodeErrorInstructions ? "1" : ".25",
						}}
					>
						{props.errorGroup &&
							props.errorGroup.attributes &&
							Object.keys(props.errorGroup.attributes).map(key => {
								const value: { type: string; value: any } = props.errorGroup.attributes![key];
								return (
									<DataRow>
										<DataLabel>{key}:</DataLabel>
										<DataValue>
											{value.type === "timestamp" && (
												<Timestamp className="no-padding" time={value.value as number} />
											)}
											{value.type !== "timestamp" && <>{value.value}</>}
										</DataValue>
									</DataRow>
								);
							})}

						{repoName && (
							<DataRow data-testid="code-error-repo">
								<DataLabel>Repo:</DataLabel>
								<DataValue>{repoName}</DataValue>
							</DataRow>
						)}

						{sha && (
							<DataRow data-testid="code-error-ref">
								<DataLabel>Build:</DataLabel>
								<DataValue>{sha?.substring(0, 7)}</DataValue>
							</DataRow>
						)}
					</div>

					{stackTraceLines && renderStackTraceLines()}
					{!stackTraceLines && stackTraceText && renderStackTraceText()}
					{renderLogsIcon()}
					{renderFooter()}
				</MinimumWidthCard>
			</div>
		</>
	);
};
