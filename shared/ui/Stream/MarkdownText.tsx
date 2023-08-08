import React from "react";
import styled from "styled-components";
import { useMarkdownifyToHtml } from "./Markdowner";

export const MarkdownText = styled(
	(props: {
		text: string;
		as?: "string" | React.ElementType | React.FunctionComponent;
		className?: string;
		inline?: boolean;
		excludeOnlyEmoji?: boolean;
		isHtml?: boolean;
		includeCodeBlockCopy?: boolean;
	}) => {
		const markdownifyToHtml = useMarkdownifyToHtml();

		return React.createElement(
			// casting to `any` on the next line because of a terrible type declaration for React.createElement that hardcodes the string 'input' as the first argument
			props.as ?? "span",
			{
				className: props.className,
				dangerouslySetInnerHTML: {
					__html: props.isHtml
						? props.text
						: markdownifyToHtml(props.text, {
								inline: !!props.inline,
								excludeOnlyEmoji: !!props.excludeOnlyEmoji,
								includeCodeBlockCopy: !!props.includeCodeBlockCopy,
						  }),
				},
			},
			null
		);
	}
)`
	white-space: normal;
	text-overflow: initial;
	p {
		margin: 0;
	}
	.code,
	code {
		max-width: 100%;
		overflow-x: auto; // A long code snippet can extend past the container and look weird
	}
	white-space: pre-wrap;
	word-wrap: break-word;
	// need to increase priority for the li padding
	.codestream .stream & {
		ul:not(.linenums),
		ol:not(.linenums) {
			margin: 0;
			padding-left: 20px;
			li {
				padding: 5px 0 !important;
			}
		}
	}
	.related {
		position: relative;
		margin-bottom: 0;
	}
	.copy-icon-display-none {
		display: none;
	}
	.js-suggested-changes-blob {
		white-space: normal;
		&.border,
		.border {
			border: 1px solid var(--base-border-color);
		}
		&.rounded-1,
		.rounded-1 {
			border-radius: 6px;
		}
		.d-flex {
			display: flex !important;
		}
		.flex-auto {
			flex: auto;
		}
		.p-2 {
			padding: 8px;
		}
		.border-bottom {
			border-bottom: 1px solid var(--base-border-color);
		}
		.file {
			border-radius: 6px;
		}
		table {
			border-spacing: 0;
			border-collapse: collapse;
			td {
				padding: 4px 8px;
			}
		}		
		.blob-num {
			width: 1%;
			min-width: 50px;
			padding-right: 10px;
			padding-left: 10px;
			text-align: right;
			white-space: nowrap;
			vertical-align: top;
			cursor: pointer;
			-webkit-user-select: none;
			-moz-user-select: none;
			-ms-user-select: none;
			user-select: none;
		}
		.blob-num::before {
			content: attr(data-line-number);
		}
		.blob-num-deletion {
			background: rgba(255, 0, 0, 0.2);
		}
		.blob-num-addition {
			background: rgba(80, 255, 0, 0.18);
		}
		.blob-code-marker-deletion {
			background: rgba(255, 0, 0, 0.1);
			var(--text-color-subtle);
		}
		.blob-code-marker-addition {
			background: rgba(80, 255, 0, 0.09);
			var(--text-color-subtle);
		}
		.blob-code-marker-deletion::before {
			content: "- ";
		}
		.blob-code-marker-addition::before {
			content: "+ ";
		}
	}
`;
