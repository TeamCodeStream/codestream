import React from "react";
import * as Path from "path-browserify";
import { prettyPrintOne } from "code-prettify";
import { escapeHtml } from "../utils";
import styled from "styled-components";
import Icon from "./Icon";
import { PullRequestInlineComment } from "./PullRequestInlineComment";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

const Root = styled.div`
	font-size: 12px;
	overflow-x: auto;
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: pre;
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
	max-width: calc(100vw - 50px);
	padding: 0 20px;
`;

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
	hunks?: Hunk[];
	filename: string;
	className?: string;
	noHeader?: boolean;
	comment?: boolean;
	pr?: FetchThirdPartyPullRequestPullRequest;
}) => {
	const { patch, filename, hunks } = props;

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
		if (props.comment) {
			return (
				<div className="plus-container">
					<Icon name="plus" className="plus" onClick={() => openComment(index)} />
					{pre}
				</div>
			);
		} else return pre;
	};

	if (patch) {
		return (
			<Root className={(props.className || "") + " pr-patch"}>
				<div style={{ position: "relative" }}>
					{patch.split("\n").map((_, index) => {
						if (_ === "\\ No newline at end of file") return null;

						const comment =
							props.pr && commentOpen[index] ? (
								<PRInlineComment>
									<PullRequestInlineComment
										pr={props.pr}
										lineOffsetInHunk={index}
										fetch={() => {}}
										setIsLoadingMessage={() => {}}
										__onDidRender={() => {}}
										onClose={() => closeComment(index)}
									/>
								</PRInlineComment>
							) : null;

						if (_.indexOf("@@ ") === 0) {
							const matches = _.match(/@@ \-(\d+).*? \+(\d+)/);
							if (matches) {
								leftLine = parseInt(matches[1], 10) - 1;
								rightLine = parseInt(matches[2]) - 1;
								width = Math.max(4, rightLine.toString().length + 1);
							}
							if (props.noHeader) return null;
							return (
								<>
									<div className="line header">
										{renderLineNum("")}
										{renderLineNum("")}
										<pre className="prettyprint">{_}</pre>
									</div>
									{comment}
								</>
							);
						} else if (_.indexOf("+") === 0) {
							rightLine++;
							return (
								<>
									<div className="line added">
										{renderLineNum("")}
										{renderLineNum(rightLine)}
										{syntaxHighlight(_, index)}
									</div>
									{comment}
								</>
							);
						} else if (_.indexOf("-") === 0) {
							leftLine++;
							return (
								<>
									<div className="line deleted">
										{renderLineNum(leftLine)}
										{renderLineNum("")}
										{syntaxHighlight(_, index)}
									</div>
									{comment}
								</>
							);
						} else {
							leftLine++;
							rightLine++;
							return (
								<>
									<div className="line same">
										{renderLineNum(leftLine)}
										{renderLineNum(rightLine)}
										{syntaxHighlight(_, index)}
									</div>
									{comment}
								</>
							);
						}
					})}
				</div>
			</Root>
		);
	} else if (hunks) {
		return (
			<Root className={(props.className || "") + " pr-patch"}>
				<div style={{ position: "relative" }}>
					{hunks.map((hunk, index) => {
						leftLine = hunk.oldStart - 1;
						rightLine = hunk.newStart - 1;
						width = Math.max(4, rightLine.toString().length + 1);
						return (
							<>
								<div className="line header">
									{renderLineNum("")}
									{renderLineNum("")}
									<pre className="prettyprint">
										@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
									</pre>
								</div>
								{hunk.lines.map(_ => {
									if (_ === "\\ No newline at end of file") return null;
									if (_.indexOf("+") === 0) {
										rightLine++;
										return (
											<div className="line added">
												{renderLineNum("")}
												{renderLineNum(rightLine)}
												{syntaxHighlight(_, index)}
											</div>
										);
									} else if (_.indexOf("-") === 0) {
										leftLine++;
										return (
											<div className="line deleted">
												{renderLineNum(leftLine)}
												{renderLineNum("")}
												{syntaxHighlight(_, index)}
											</div>
										);
									} else {
										leftLine++;
										rightLine++;
										return (
											<div className="line same">
												{renderLineNum(leftLine)}
												{renderLineNum(rightLine)}
												{syntaxHighlight(_, index)}
											</div>
										);
									}
								})}
							</>
						);
					})}
				</div>
			</Root>
		);
	} else return null;
};
