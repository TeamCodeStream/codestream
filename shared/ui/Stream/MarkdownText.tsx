import styled from "styled-components";
import { useMarkdownifyToHtml } from "./Markdowner";
import React from "react";

export const MarkdownText = styled(
	(props: {
		text: string;
		as?: "string" | React.ElementType | React.Component;
		className?: string;
		inline?: boolean;
		excludeOnlyEmoji?: boolean;
		isHtml?: boolean;
	}) => {
		const markdownifyToHtml = useMarkdownifyToHtml();

		return React.createElement(
			// casting to `any` on the next line because of a terrible type declaration for React.createElement that hardcodes the string 'input' as the first argument
			props.as || ("span" as any),
			{
				className: props.className,
				dangerouslySetInnerHTML: {
					__html: props.isHtml
						? props.text
						: markdownifyToHtml(props.text, {
								inline: !!props.inline,
								excludeOnlyEmoji: !!props.excludeOnlyEmoji
						  })
				}
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
`;
