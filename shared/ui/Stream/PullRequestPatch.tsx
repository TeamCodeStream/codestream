import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { prettyPrintOne } from "code-prettify";
import * as Path from "path-browserify";
import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { escapeHtml } from "../utils";
import Icon from "./Icon";
import { PullRequestCodeComment } from "./PullRequestCodeComment";
import { PRCard, PRComment, PRCommentsInPatch } from "./PullRequestComponents";
import { PullRequestInlineComment } from "./PullRequestInlineComment";

export const PRPatchRoot = styled.div`
	font-size: 12px;
	overflow-x: auto;
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: pre;
	border: 1px solid var(--base-border-color);
	border-top: 0;
	tab-size: 2;
	pre {
		white-space: pre !important;
		padding: 1px 10px !important;
		margin: 0;
		display: inline-block;
	}
	> div {
		float: left;
		min-width: 100%;
	}
	.line {
		display: flex;
		padding: 0px;
		.linenum {
			padding: 1px 10px;
			color: var(--text-color-subtle);
		}
		margin: 0;
		width: 100%;
	}

	.line {
		.plus-container {
			position: relative;
			width: 100%;

			.plus {
				position: absolute;
				cursor: pointer;
				left: -10px;
				top: -2px;
				display: inline-block;
				padding: 2px;
				color: var(--button-foreground-color);
				background: var(--button-background-color);
				border-radius: 4px;
				display: none;
				transition: transform 0.2s;
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
				.vscode-dark & {
					box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
				}
			}
			&:hover {
				.plus {
					display: block;
					transform: scale(0.8);
					&:hover {
						transform: scale(1.1);
						background: var(--button-background-color-hover);
					}
				}
			}
		}
	}

	.added {
		background: rgba(80, 255, 0, 0.09);
		.linenum {
			background: rgba(80, 255, 0, 0.09);
		}
	}
	.deleted {
		background: rgba(255, 0, 0, 0.1);
		.linenum {
			background: rgba(255, 0, 0, 0.1);
		}
	}
	.header {
		color: var(--text-color-subtle);
		background: rgba(0, 150, 255, 0.09);
		.linenum {
			background: rgba(0, 150, 255, 0.09);
		}
	}
`;

export const PRInlineComment = styled.div`
	// max-width: calc(100vw - 50px);
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
`;

const Ellipsis = styled.span``;

export interface Hunk {
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: string[];
	linedelimiters: string[];
}

export const PullRequestPatch = (props: {
	patch?: string;
	mode?: string;
	hunks?: Hunk[];
	filename: string;
	className?: string;
	noHeader?: boolean;
	canComment?: boolean;
	comments?: { comment: any; review: any }[];
	commentId?: string;
	pr?: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage?: Function;
	truncateLargePatches?: boolean;
	quote?: Function;
}) => {
	const { patch, filename, hunks } = props;

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			isGitLab:
				state && state.context && state.context.currentPullRequest
					? state.context.currentPullRequest.providerId.indexOf("gitlab") > -1
					: false,
		};
	});

	const [commentOpen, setCommentOpen] = React.useState<boolean[]>([]);

	let startLine: number;
	let leftLine: number;
	let rightLine: number;
	let width;

	let extension = Path.extname(filename).toLowerCase();
	if (extension.startsWith(".")) {
		extension = extension.substring(1);
	}

	const renderLineNum = line => (
		<pre className="linenum">{(line + "").padStart(width, " ") + ""}</pre>
	);

	const openComment = (index: number) => {
		let newCommentOpen = [...commentOpen];
		newCommentOpen[index] = true;
		setCommentOpen(newCommentOpen);
	};

	const closeComment = (index: number) => {
		let newCommentOpen = [...commentOpen];
		newCommentOpen[index] = false;
		setCommentOpen(newCommentOpen);
	};

	const syntaxHighlight = (string: string, index: number) => {
		// put a space to the right of the + or - sign
		const string2 = string.slice(0, 1) + " " + string.slice(1);
		const html = prettyPrintOne(escapeHtml(string2), extension);
		const pre = <pre className="prettyprint" dangerouslySetInnerHTML={{ __html: html }} />;
		if (props.canComment) {
			return (
				<div className="plus-container">
					<Icon name="plus" className="plus" onClick={() => openComment(index)} />
					{pre}
				</div>
			);
		} else return pre;
	};

	if (patch) {
		const patchLength = patch.split("\n").length;
		const patchShowContextLines = 4;
		return (
			<PRPatchRoot className={(props.className || "") + " pr-patch"}>
				<div style={{ position: "relative" }}>
					{patch.split("\n").map((patchLine, index) => {
						const shouldSkipLine =
							props.truncateLargePatches &&
							patchLength > patchShowContextLines * 2 + 2 &&
							index > patchShowContextLines &&
							index < patchLength - patchShowContextLines;

						if (patchLine === "\\ No newline at end of file") return null;

						const renderCommentForm = (
							oldLineNumber: number | undefined = undefined,
							type: "-" | "+" | undefined = undefined
						) =>
							props.pr && commentOpen[index] ? (
								<PRInlineComment key={"ic-" + index}>
									<PullRequestInlineComment
										pr={props.pr}
										mode={props.mode}
										filename={filename}
										contents={patchLine}
										// gitlab needs an old line number
										// if commenting on non-new code
										oldLineNumber={
											derivedState.isGitLab
												? oldLineNumber != null
													? oldLineNumber
													: undefined
												: undefined
										}
										// gitlab doesn't need a lineNumber (right side or + side)
										// if you're commenting on code that was removed
										lineNumber={
											derivedState.isGitLab ? (type !== "-" ? rightLine : undefined) : rightLine + 1
										}
										lineOffsetInHunk={index}
										setIsLoadingMessage={() => {}}
										__onDidRender={() => {}}
										onClose={() => closeComment(index)}
									/>
								</PRInlineComment>
							) : null;

						const renderComments = (type?: "-" | "+" | undefined) => {
							let commentsOnLine;
							if (derivedState.isGitLab && type === "-") {
								// ensure we are rendering comments in the correct
								// spot for comments that are tied to lines of code
								// that have been removed.
								commentsOnLine = (props.comments || []).filter(
									_ => _.comment.position.oldLine == leftLine
								);
							} else {
								commentsOnLine = (props.comments || []).filter(_ =>
									typeof _.comment.position === "number"
										? _.comment.position == index
										: _.comment.position?.newLine == rightLine
								);
							}
							return commentsOnLine.length === 0 ? null : (
								<PRCommentsInPatch key={"cip-" + index}>
									{commentsOnLine.map(({ comment, review }, index) => (
										<PRComment key={index} style={{ margin: 0 }} data-comment-id={comment.id}>
											<PRCard>
												<PullRequestCodeComment
													pr={props.pr!}
													mode={props.mode}
													setIsLoadingMessage={props.setIsLoadingMessage!}
													item={review}
													comment={comment}
													author={comment.author}
												/>
											</PRCard>
										</PRComment>
									))}
								</PRCommentsInPatch>
							);
						};

						if (patchLine.indexOf("@@ ") === 0) {
							const matches = patchLine.match(/@@ \-(\d+).*? \+(\d+)/);
							if (matches) {
								leftLine = parseInt(matches[1], 10) - 1;
								rightLine = parseInt(matches[2]) - 1;
								width = Math.max(4, rightLine.toString().length + 1);
							}
							if (props.noHeader) return null;
							return (
								<React.Fragment key={index}>
									<div className="line header">
										{renderLineNum("")}
										{renderLineNum("")}
										<pre className="prettyprint">{patchLine}</pre>
									</div>
									{renderComments()}
									{renderCommentForm()}
								</React.Fragment>
							);
						} else if (patchLine.indexOf("+") === 0) {
							rightLine++;
							switch (true) {
								case shouldSkipLine && index === patchLength - patchShowContextLines - 1:
									return <Ellipsis key={index}>...</Ellipsis>;
								case shouldSkipLine:
									return undefined;
								default:
									return (
										<React.Fragment key={index}>
											<div className="line added">
												{renderLineNum("")}
												{renderLineNum(rightLine)}
												{syntaxHighlight(patchLine, index)}
											</div>
											{renderComments()}
											{renderCommentForm()}
										</React.Fragment>
									);
							}
						} else if (patchLine.indexOf("-") === 0) {
							leftLine++;
							switch (true) {
								case shouldSkipLine && index === patchLength - patchShowContextLines - 1:
									return <Ellipsis key={index}>...</Ellipsis>;
								case shouldSkipLine:
									return undefined;
								default:
									return (
										<React.Fragment key={index}>
											<div className="line deleted">
												{renderLineNum(leftLine)}
												{renderLineNum("")}
												{syntaxHighlight(patchLine, index)}
											</div>
											{renderComments("-")}
											{renderCommentForm(leftLine, "-")}
										</React.Fragment>
									);
							}
						} else {
							leftLine++;
							rightLine++;
							switch (true) {
								case shouldSkipLine && index === patchLength - patchShowContextLines - 1:
									return <Ellipsis key={index}>...</Ellipsis>;
								case shouldSkipLine:
									return undefined;
								default:
									return (
										<React.Fragment key={index}>
											<div className="line same">
												{renderLineNum(leftLine)}
												{renderLineNum(rightLine)}
												{syntaxHighlight(patchLine, index)}
											</div>
											{renderComments()}
											{renderCommentForm(leftLine)}
										</React.Fragment>
									);
							}
						}
					})}
				</div>
			</PRPatchRoot>
		);
	} else if (hunks) {
		return (
			<PRPatchRoot className={(props.className || "") + " pr-patch"}>
				<div style={{ position: "relative" }}>
					{hunks.map((hunk, index) => {
						leftLine = hunk.oldStart - 1;
						rightLine = hunk.newStart - 1;
						width = Math.max(4, rightLine.toString().length + 1);
						return (
							<React.Fragment key={index}>
								<div className="line header" key="line-header">
									{renderLineNum("")}
									{renderLineNum("")}
									<pre className="prettyprint">
										@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
									</pre>
								</div>
								{hunk.lines.map((_, i) => {
									if (_ === "\\ No newline at end of file") return null;
									if (_.indexOf("+") === 0) {
										rightLine++;
										return (
											<div className="line added" key={`line-added-${i}`}>
												{renderLineNum("")}
												{renderLineNum(rightLine)}
												{syntaxHighlight(_, index)}
											</div>
										);
									} else if (_.indexOf("-") === 0) {
										leftLine++;
										return (
											<div className="line deleted" key={`line-deleted-${i}`}>
												{renderLineNum(leftLine)}
												{renderLineNum("")}
												{syntaxHighlight(_, index)}
											</div>
										);
									} else {
										leftLine++;
										rightLine++;
										return (
											<div className="line same" key={`line-same-${i}`}>
												{renderLineNum(leftLine)}
												{renderLineNum(rightLine)}
												{syntaxHighlight(_, index)}
											</div>
										);
									}
								})}
							</React.Fragment>
						);
					})}
				</div>
			</PRPatchRoot>
		);
	} else return null;
};
