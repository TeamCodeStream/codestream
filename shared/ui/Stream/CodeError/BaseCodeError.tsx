import {
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsRequestType,
	GetErrorInboxCommentsResponse,
} from "@codestream/protocols/agent";
import { CSStackTraceLine } from "@codestream/protocols/api";
import React, { useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import { OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { CardFooter, getCardProps } from "@codestream/webview/src/components/Card";
import { TourTip } from "@codestream/webview/src/components/TourTip";
import { CodeStreamState } from "@codestream/webview/store";
import { copySymbolFromIde, jumpToStackLine } from "@codestream/webview/store/codeErrors/thunks";
import { isGrokStreamLoading } from "@codestream/webview/store/posts/reducer";
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
import Icon from "../Icon";
import { DiscussionThread } from "../Discussions/DiscussionThread";
import Timestamp from "../Timestamp";
import Tooltip from "../Tooltip";
import { isFeatureEnabled } from "../../store/apiVersioning/reducer";
import { isEmpty } from "lodash-es";
import { getNrCapability } from "@codestream/webview/store/nrCapabilities/thunks";
import { CommentInput } from "../Discussions/Comment";
import { Discussion } from "@codestream/webview/store/types";
import { DiscussionLoadingSkeleton } from "../Discussions/SkeletonLoader";
import {
	BaseCodeErrorProps,
	CopyMethodState,
	InitialDiscussion,
	ClickLines,
	DisabledClickLine,
	ClickLine,
	ComposeWrapper,
	Message,
	DataRow,
	DataLabel,
	DataValue,
} from "./CodeError.Types";

export const BaseCodeError = (props: BaseCodeErrorProps) => {
	const dispatch = useAppDispatch();

	const functionToEdit = useAppSelector(state => state.codeErrors.functionToEdit);
	const functionToEditFailed = useAppSelector(state => state.codeErrors.functionToEditFailed);
	const isGrokLoading = useAppSelector(isGrokStreamLoading);
	const grokNraiCapability = useAppSelector(state => state.nrCapabilities.nrai === true);
	const grokFeatureEnabled = useAppSelector(state => isFeatureEnabled(state, "showGrok"));

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const currentCodeErrorData = state.context.currentCodeErrorData;

		return {
			repos: state.repos,
			providers: state.providers,
			isInVscode: state.ide.name === "VSC",
			currentCodeErrorData,
			hideCodeErrorInstructions: state.preferences.hideCodeErrorInstructions,
			traceId: currentCodeErrorData?.traceId,
			ideName: state.ide.name,
		};
	}, shallowEqual);

	const [currentSelectedLine, setCurrentSelectedLineIndex] = useState<number>(
		derivedState.currentCodeErrorData?.lineIndex || 0
	);
	const [didJumpToFirstAvailableLine, setDidJumpToFirstAvailableLine] = useState(false);
	const [copyMethodState, setMethodCopyState] = useState<CopyMethodState>("NOT_STARTED");
	const [jumpLocation, setJumpLocation] = useState<number | undefined>();

	const [currentNrAiFile, setCurrentNrAiFile] = useState<string | undefined>(undefined);

	const [error, setError] = useState<string>();
	const [discussion, setDiscussion] = useState<Discussion>(InitialDiscussion);
	const [discussionIsLoading, setDiscussionIsLoading] = useState<boolean>(false);

	const allStackTraces = props.codeError.stackTraces;
	const firstStackTrace = allStackTraces
		? allStackTraces[0]
			? allStackTraces[0]
			: undefined
		: undefined;
	const firstStackTraceLines = firstStackTrace?.lines;
	const firstStackTraceText = firstStackTrace?.text;

	// const grokError = useAppSelector(state =>
	// 	state.codeErrors.grokError
	// 		? { message: state.codeErrors.grokError.errorMessage, type: "warning" }
	// 		: undefined
	// );
	useDidMount(() => {
		dispatch(getNrCapability("nrai"));

		loadDiscussion();

		if (!props.isCollapsed) {
			requestAnimationFrame(() => {
				const $stackTrace = document.getElementById("stack-trace");
				if ($stackTrace) $stackTrace.focus();
			});
		}
	});

	useEffect(() => {
		if (
			!props.isCollapsed &&
			jumpLocation !== undefined &&
			didJumpToFirstAvailableLine &&
			copyMethodState === "NOT_STARTED"
		) {
			findAndExtractCodeSymbol().then(() => {
				try {
					const stackLine = firstStackTrace!.lines[jumpLocation];
					if (stackLine.fileFullPath) {
						console.log("setCurrentNrAiFile", stackLine.fileFullPath);
						setCurrentNrAiFile(stackLine.fileFullPath);
						// Open actual file for NRAI - no ref param
						dispatch(
							jumpToStackLine({
								lineIndex: jumpLocation,
								stackLine,
								repoId: firstStackTrace!.repoId,
							})
						);
					} else {
						console.warn("nrai jumpToStackLine missing fileFullPath", stackLine);
					}
				} catch (ex) {
					console.warn(ex);
				}
			});
		}
	}, [jumpLocation, didJumpToFirstAvailableLine]);

	useEffect(() => {
		if (!props.isCollapsed && !didJumpToFirstAvailableLine) {
			if (firstStackTraceLines) {
				let lineIndex = currentSelectedLine;
				const len = firstStackTraceLines.length;
				while (lineIndex < len && !firstStackTraceLines[lineIndex].resolved) {
					lineIndex++;
				}
				if (lineIndex < len) {
					setDidJumpToFirstAvailableLine(true);
					setJumpLocation(lineIndex);
					setCurrentSelectedLineIndex(lineIndex);
				}
			}
		}
	}, [didJumpToFirstAvailableLine]);

	const showGrok = useMemo(() => {
		const result = grokNraiCapability || grokFeatureEnabled;
		console.debug("grokStates", { grokNraiCapability, grokFeatureEnabled, result });
		return result;
	}, [grokNraiCapability, grokFeatureEnabled]);

	const repoInfo = useMemo(() => {
		if (firstStackTrace && firstStackTrace.repoId) {
			const repo = derivedState.repos[firstStackTrace.repoId];
			if (!repo) return undefined;

			return {
				repoName: repo.name,
				sha: firstStackTrace.sha!,
				shortSha: firstStackTrace.sha!.substring(0, 7),
			};
		} else {
			return undefined;
		}
	}, [derivedState.repos]);

	const { allStackTracePathsResolved, noUserLines } = useMemo(() => {
		if (!firstStackTraceLines) {
			return {
				allStackTracePathsResolved: false,
				noUserLines: false,
			};
		}
		const allStackTracePathsResolved =
			firstStackTraceLines.filter(_ => _.resolved === true || !isEmpty(_.error)).length ===
			firstStackTraceLines.length;
		const noUserLines =
			firstStackTraceLines.filter(_ => !_.resolved).length === firstStackTraceLines.length;
		return { allStackTracePathsResolved, noUserLines };
	}, [firstStackTraceLines]);

	const loadDiscussion = () => {
		if (!derivedState.currentCodeErrorData) {
			return;
		}

		setDiscussionIsLoading(true);

		const payload: GetErrorInboxCommentsRequest = {
			accountId: derivedState.currentCodeErrorData.accountId!,
			errorGroupGuid: derivedState.currentCodeErrorData.errorGroupGuid!,
			entityGuid: derivedState.currentCodeErrorData.entityGuid!,
		};

		if (!functionToEditFailed && functionToEdit) {
			payload.NRAI = {
				nrAIEnabled: showGrok,
				file: functionToEdit.uri,
				code: functionToEdit.codeBlock,
				permalink: "",
				repo: repoInfo?.repoName,
				sha: repoInfo?.sha,
			};
		} else {
			// just in case we get here and don't have a function for some reason just make
			// sure we don't do AI stuff
			delete payload.NRAI;
		}

		HostApi.instance
			.send(GetErrorInboxCommentsRequestType, payload)
			.then((response: GetErrorInboxCommentsResponse) => {
				if (response.error) {
					setError(response.error.error.message);
				} else {
					setDiscussion({
						threadId: response.threadId!,
						comments: response.comments!,
					});
				}
			})
			.catch(err => {
				setError(err);
			})
			.finally(() => {
				setDiscussionIsLoading(false);
			});
	};

	const openLogs = () => {
		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "logs",
			title: "Logs",
			entryPoint: "code_error",
			entityGuid: props.errorGroup?.entityGuid,
			traceId: derivedState.currentCodeErrorData?.traceId,
			ide: {
				name: derivedState.ideName || undefined,
			},
		});
	};

	const onClickStackLine = async (event, lineIndex) => {
		event && event.preventDefault();

		if (
			firstStackTrace &&
			firstStackTrace.lines[lineIndex] &&
			firstStackTrace.lines[lineIndex].line !== undefined
		) {
			setCurrentSelectedLineIndex(lineIndex);
			dispatch(
				jumpToStackLine({
					lineIndex,
					stackLine: firstStackTrace.lines[lineIndex],
					repoId: firstStackTrace.repoId!,
					ref: firstStackTrace.sha,
				})
			);
		}
	};

	/**
	 * 	This can be incredibly complex with nested anonymous inner functions. For the current approach
	 * 	we rely on the stack trace having a named method for us to latch on to send for error analysis.
	 * 	An alternate approach would be to resolve with language symbols in the IDE and bubble up to the
	 * 	appropriate scope to find the best code segment to send. (i.e. up to the method of a class, but
	 * 	not all the way up to the class itself)
	 */
	const extractMethodName = (lines: CSStackTraceLine[]): CSStackTraceLine | undefined => {
		for (const line of lines) {
			if (
				line.method &&
				line.resolved &&
				line.method !== "<unknown>" &&
				line.fileFullPath !== "<anonymous>"
			) {
				return line;
			}
		}
		return undefined;
	};

	const findAndExtractCodeSymbol = async () => {
		if (firstStackTraceLines) {
			// This might be different from the jumpToLine lineIndex if jumpToLine is an anonymous function
			// This also might not be the best approach, but it's a start
			const line = extractMethodName(firstStackTraceLines);
			if (line?.fileFullPath) {
				try {
					// Need to call copySymbolFromIde every time to get the codeBlockStartLine
					// TODO handle the case where the code has changed since the error was created - can't use streaming patch from openai
					// TODO or store diff / startLineNo in the codeError?
					setMethodCopyState("IN_PROGRESS");
					await dispatch(copySymbolFromIde({ stackLine: line, repoId: firstStackTrace.repoId }));
				} catch (ex) {
					console.warn("symbol useEffect copySymbolFromIde failed", ex);
					setMethodCopyState("FAILED"); // setFunctionToEditFailed would have been set in preceeding copySymbolFromIde
				}
				setMethodCopyState("DONE");
			}
		}
	};

	// const handleKeyDown = event => {
	// 	if (parsedStack?.resolvedStackInfo?.lines) {
	// 		return;
	// 	}
	// 	const lines = props.parsedStack?.resolvedStackInfo?.lines;
	// 	if (!lines) return;
	// 	let nextLine = currentSelectedLine;
	// 	if (event.key === "ArrowUp" || event.which === 38) {
	// 		event.stopPropagation();
	// 		while (currentSelectedLine >= 0) {
	// 			nextLine--;
	// 			if (!lines[nextLine].error) {
	// 				onClickStackLine(event, nextLine);
	// 				return;
	// 			}
	// 		}
	// 	}
	// 	if (event.key === "ArrowDown" || event.which === 40) {
	// 		event.stopPropagation();
	// 		while (currentSelectedLine <= lines.length) {
	// 			nextLine++;
	// 			if (!lines[nextLine].error) {
	// 				onClickStackLine(event, nextLine);
	// 				return;
	// 			}
	// 		}
	// 	}
	// };
	const renderLogsIcon = () => {
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

	const renderStackTrace = () => {
		if (firstStackTraceLines?.length) {
			return (
				<MetaSection>
					<Meta id="stack-trace">
						<MetaLabel>Stack Trace</MetaLabel>
						<TourTip placement="bottom">
							<ClickLines tabIndex={0} className="code">
								{(firstStackTraceLines || []).map((line, i) => {
									if (!line || !line.fileFullPath) return null;

									const className = i === currentSelectedLine ? "monospace li-active" : "monospace";
									const mline = line.fileFullPath.replace(/\s\s\s\s+/g, "     ");
									return !line.resolved ? (
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
					{/*
                    TODO COLLAB-ERRORS: Reactions to a comment
                    {props.post && (
                        <div>
                            <Reactions className="reactions no-pad-left" post={props.post} />
                        </div>
                    )}
                    {!props.collapsed && props.post && <Attachments post={props.post as CSPost} />} */}
				</MetaSection>
			);
		}

		if (firstStackTraceText) {
			return (
				<MetaSection>
					<Meta id="stack-trace">
						<MetaLabel>Stack Trace</MetaLabel>
						<TourTip placement="bottom">
							<ClickLines id="stack-trace" className="code" tabIndex={0}>
								{firstStackTraceText.split("\n").map((line: string, i) => {
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
					{/*
                    TODO COLLAB-ERRORS: Reactions to a comment
                    {props.post && (
                        <div>
                            <Reactions className="reactions no-pad-left" post={props.post} />
                        </div>
                    )}
                    {!props.collapsed && props.post && <Attachments post={props.post as CSPost} />} */}
				</MetaSection>
			);
		}
		return null;
	};

	const renderFooter = () => {
		if (props.isCollapsed) return null;

		return (
			<CardFooter
				className={isGrokLoading ? "grok-loading" : "grok-not-loading" + " replies-to-review"}
				style={{ borderTop: "none", marginTop: 0 }}
			>
				{!error && !discussion && discussionIsLoading && (
					<DiscussionLoadingSkeleton></DiscussionLoadingSkeleton>
				)}

				{!error && discussion && !discussionIsLoading && (
					<>
						{<MetaLabel>Discussion</MetaLabel>}

						<DiscussionThread
							discussion={discussion}
							file={currentNrAiFile}
							functionToEdit={functionToEdit}
							isLoading={discussionIsLoading}
							reloadDiscussion={loadDiscussion}
						/>

						<ComposeWrapper>
							<CommentInput
								threadId={discussion.threadId}
								codeError={props.codeError}
								showGrok={showGrok}
								isLoading={discussionIsLoading}
								reloadDiscussion={loadDiscussion}
							/>
						</ComposeWrapper>
					</>
				)}
				{error && !discussionIsLoading && (
					<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
						<h4>{error}</h4>
					</div>
				)}
			</CardFooter>
		);
	};

	return (
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

			{/* assuming 3 items (58px) */}
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

				{repoInfo && (
					<DataRow data-testid="code-error-repo">
						<DataLabel>Repo:</DataLabel>
						<DataValue>{repoInfo.repoName}</DataValue>
					</DataRow>
				)}

				{repoInfo && (
					<DataRow data-testid="code-error-ref">
						<DataLabel>Build:</DataLabel>
						<DataValue>{repoInfo.sha}</DataValue>
					</DataRow>
				)}
			</div>

			{renderStackTrace()}
			{derivedState.currentCodeErrorData?.traceId && renderLogsIcon()}
			{renderFooter()}
		</MinimumWidthCard>
	);
};
