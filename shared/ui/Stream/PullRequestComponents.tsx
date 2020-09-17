import { Button } from "../src/components/Button";
import styled from "styled-components";
import { Headshot, PRHeadshot } from "../src/components/Headshot";
import { PRHeadshotName } from "../src/components/HeadshotName";
import { PullRequestReactButton } from "./PullRequestReactions";
import { TextButton } from "../src/components/controls/InlineMenu";
import { WidthBreakpoint } from "./PullRequest";
import { Tabs, Tab } from "../src/components/Tabs";

export const PENDING_BORDER_COLOR = "rgba(249, 197, 19, 0.6)";
export const PENDING_BACKGROUND_COLOR = "rgba(255, 223, 0, 0.1)";

export const PRHeader = styled.div`
	margin: 35px 15px 0 20px;
	.open-external {
		margin-left: 5px;
		vertical-align: 3px;
		font-size: 12px;
		display: none;
	}
	&:hover .open-external {
		display: inline-block;
	}
	${Tabs} {
		margin: 10px -15px 0 -20px;
	}
	${Tab} {
		font-size: 13px;
		white-space: nowrap;
		padding: 0 10px 10px 10px;
		.icon {
			// vertical-align: -2px;
			display: inline-block;
			margin: 0 5px;
		}
	}
`;

export const PRTitle = styled.div`
	font-size: 20px;
	&:not(.editing) {
		// padding-right: 50px;
	}
	a {
		color: var(--text-color);
		opacity: 0.5;
		text-decoration: none;
		&:hover {
			color: var(--text-color-info);
			opacity: 1;
		}
	}
`;

export const PRActionButtons = styled.div`
	// top: 20px;
	// right: 20px;
	border: 1px solid var(--base-border-color);
	border-radius: 5px;
	background: var(--base-background-color);
	white-space: nowrap;
	display: flex;
	margin-left: 10px;
	overflow: hidden;
	flex-shrink: 0;
	> span {
		// padding-left: 10px;
		display: inline-block;
		padding: 0;
	}
	> span + span {
		border-left: 1px solid var(--base-border-color);
	}
	.icon {
		vertical-align: 2px;
		display: inline-block;
		font-size: 11px !important; // to match the spinnable icon
		line-height: 16px !important;
		opacity: 0.7;
		padding: 8px !important;
		width: auto !important;
		height: auto !important;
	}
	> span:not(.disabled) .icon:hover {
		cursor: pointer;
		opacity: 1;
		background: var(--button-background-color) !important;
		color: var(--button-foreground-color) !important;
	}
	> span.disabled .icon {
		opacity: 0.25;
	}
	.cancel-button {
		opacity: 1 !important;
		// vertical-align: 3px;
		.icon.button {
			border-radius: 0 5px 5px 0 !important;
		}
	}
`;

export const PRSelectorButtons = styled.div`
	cursor: pointer;
	border: 1px solid var(--base-border-color);
	border-radius: 5px;
	background: var(--app-background-color);
	white-space: nowrap;
	display: inline-flex;
	overflow: hidden;
	> span {
		display: inline-block;
		padding: 5px 10px;
		&.selected,
		&:hover {
			background: var(--base-background-color);
		}
	}
	> span + span {
		border-left: 1px solid var(--base-border-color);
	}
`;

export const PREditTitle = styled.div`
	width: 100%;
	display: flex;
	// margin-top: -1px;
	line-height: 28px;
	#title-input {
		margin: 0 0 0 -6px !important;
		font-size: 20px !important;
		flex-grow: 10;
		padding: 2px 6px !important;
		height: 28px;
		line-height: 28px;
	}
	> button {
		padding-top: 0;
		padding-bottom: 0;
		margin: 0 0 0 10px;
		height: 28px;
		line-height: 13px;
	}
`;

export const PRStatusButton = styled(Button)`
	flex-grow: 0;
	border-radius: 15px;
	margin-right: 10px;
	padding-left: 12px;
	padding-right: 12px;
	.icon {
		margin-right: 5px;
	}
	text-transform: capitalize;
	white-space: nowrap;
`;

export const PRStatusMessage = styled.div`
	flex-grow: 10;
`;

export const PRAuthor = styled.span`
	font-weight: bold;
	padding-right: 5px;
	color: var(--text-color-highlight);
`;

export const PRBranch = styled.span`
	display: inline-block;
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	color: var(--text-color-highlight);
`;

export const PRAction = styled.span`
	color: var(--text-color-subtle);
`;

export const PRBadge = styled.span`
	display: inline-block;
	// background: rgba(127, 127, 127, 0.25);
	background: #ddd;
	.vscode-dark & {
		background: #333;
	}
	border-radius: 9px;
	padding: 0 5px;
	min-width: 18px;
	text-align: center;
	margin: 0 5px;
`;

export const PRPlusMinus = styled.div`
	float: right;
	margin-left: auto;
	margin-right: 15px;
	font-size: smaller;
	.added {
		white-space: nowrap;
		padding-left: 5px;
		color: #66aa66;
	}
	.deleted {
		white-space: nowrap;
		padding-left: 5px;
		color: #cc3366;
	}
`;
export const PRStatusHeadshot = styled.div`
	width: 40px;
	height: 40px;
	position: absolute;
	left: 0;
	top: 0;
	border-radius: 5px;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-shrink: 0;
	.icon {
		transform: scale(2);
		color: white;
	}
`;

export const PRComment = styled.div`
	margin: 30px 0;
	position: relative;
	${PRHeadshot}, ${Headshot} {
		position: absolute;
		left: 0;
		top: 0;
		// div,
		// img {
		// 	border-radius: 50%;
		// }
	}
`;

export const PRCommentCard = styled.div`
	border: 1px solid;
	border-color: var(--base-border-color);
	background: var(--app-background-color);
	&.add-comment,
	.vscode-dark & {
		background: var(--base-background-color);
	}
	border-radius: 5px;
	padding: 10px 15px;
	margin-left: 60px;
	z-index: 2;
	h1 {
		font-size: 15px;
		margin: 0 0 2px 0;
	}
	> p {
		margin: 0;
		color: var(--text-color-subtle);
	}
	&:before {
		z-index: 5;
		content: "";
		position: absolute;
		left: 55px;
		top: 15px;
		width: 10px;
		height: 10px;
		transform: rotate(45deg);
		border-left: 1px solid var(--base-border-color);
		border-bottom: 1px solid var(--base-border-color);
		background: var(--app-background-color);
	}
	.vscode-dark &:before,
	&.add-comment:before,
	&.dark-header:before {
		background: var(--base-background-color);
	}
	&.finish-review-dropdown:before,
	&.no-arrow:before {
		display: none;
	}
	&.finish-review-timeline {
		position: relative;
		.review-PENDING & {
			border-color: ${PENDING_BORDER_COLOR};
		}
		.review-PENDING & .row-with-icon-actions {
			background: ${PENDING_BACKGROUND_COLOR};
		}
		&:before {
			left: 10px;
			top: -6px;
			border-left: 1px solid ${PENDING_BORDER_COLOR};
			border-top: 1px solid ${PENDING_BORDER_COLOR};
			border-bottom: none;
		}
	}
	&.green-border:before {
		border-color: #7aba5d;
	}
`;

export const PRActionCommentCard = styled.div`
	position: relative;
	border: 1px solid;
	border-color: var(--base-border-color);
	background: var(--app-background-color);
	.vscode-dark & {
		background: var(--base-background-color);
	}
	border-radius: 5px;
	padding: 10px 15px;
	margin-left: 60px;
	&.shift-left {
		margin-top: 10px;
		margin-left: -10px;
	}
	margin-bottom: 15px;
	z-index: 2;
	h1 {
		font-size: 15px;
		margin: 0 0 2px 0;
	}
	p {
		margin: 0;
		color: var(--text-color-subtle);
	}
	&:before {
		z-index: 5;
		content: "";
		position: absolute;
		left: 10px;
		top: -5px;
		width: 10px;
		height: 10px;
		transform: rotate(45deg);
		border-left: 1px solid var(--base-border-color);
		border-top: 1px solid var(--base-border-color);
		background: var(--app-background-color);
	}
	.vscode-dark &:before,
	&.dark-header:before {
		background: var(--base-background-color);
	}
	&.green-border:before {
		border-color: #7aba5d;
	}
`;

// this is the "Finish your review" button
export const PRSubmitReviewButton = styled.div`
	position: relative;
	float: right;
	margin-left: auto;
	margin-top: -10px;
	margin-right: 16px;
	> button {
		margin-left: 10px;
		border-radius: 5px;
		white-space: nowrap;
		${PRBadge} {
			line-height: 1.42857143 !important;
			background-color: rgba(0, 0, 0, 0.2);
		}
	}
	${PRCommentCard} {
		position: absolute;
		z-index: 50;
		right: 0;
		top: 30px;
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		.vscode-dark& {
			box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
		}
		width: calc(100vw - 30px);
		max-width: 600px;
		label {
			color: var(--text-color-highlight);
		}
	}
`;

export const PRReaction = styled.div`
	display: inline-block;
	padding: 5px 15px;
	border-right: 1px solid var(--base-border-color);
	cursor: pointer;
	p {
		display: inline-block;
		margin: 0 2px 0 0;
		padding: 0;
		vertical-align: -1px;
		.emoji {
			color: var(--text-color-highlight);
		}
	}
`;

export const PRReactions = styled.div`
	border-top: 1px solid var(--base-border-color);
	margin: 10px -15px -10px -15px;
	${PullRequestReactButton} {
		display: none;
	}
	&:hover {
		${PullRequestReactButton} {
			padding-left: 15px;
			display: inline-block;
		}
	}
`;

export const PRButtonRow = styled.div`
	padding-top: 10px;
	text-align: right;

	&.align-left {
		text-align: left;
	}
	&.border-top {
		border-top: 1px solid var(--base-border-color);
		margin-left: -15px;
		margin-right: -15px;
		padding: 10px 15px 0 15px;
	}
	button + button {
		margin-left: 10px;
	}
`;

export const PRThreadedCommentCard = styled.div`
	position: relative;
	border: 1px solid;
	border-color: var(--base-border-color);
	background: var(--app-background-color);
	.vscode-dark & {
		background: var(--base-background-color);
	}
	.review-PENDING & {
		display: flex;
		border-color: ${PENDING_BORDER_COLOR};
	}
	.review-PENDING & .row-with-icon-actions {
		background: ${PENDING_BACKGROUND_COLOR};
		margin: -10px -15px !important;
		padding: 10px 15px 3px 15px !important;
		height: auto !important;
		border-radius: 5px 5px 0 0;
	}
	border-radius: 5px;
	padding: 10px 15px;
	margin: 15px 0 15px 90px;
	z-index: 2;

	h1 {
		font-size: 15px;
		margin: 0 0 2px 0;
	}
	p {
		margin: 0;
		color: var(--text-color-subtle);
	}
	&.green-border:before {
		border-color: #7aba5d;
	}
	${PRReactions} {
		border: none;
		margin: -5px 0 15px 35px;
	}
	${PRReaction} {
		padding: 1px 8px;
		margin: 0 5px 5px;
		border: 1px solid var(--base-border-color);
		border-radius: 5px;
	}
`;

export const PRConversation = styled.div`
	position: relative;

	&:before {
		content: "";
		position: absolute;
		left: 76px;
		z-index: 0;
		top: 0;
		height: 100%;
		width: 2px;
		background: var(--base-border-color);
	}
`;

export const PRTimelineItem = styled.div`
	position: relative;
	display: flex;
	margin: 15px 0;
	padding-left: 62px;
	${PRHeadshot} {
		flex-shrink: 0;
		// margin: 0 10px;
		// div,
		// img {
		// 	border-radius: 50%;
		// }
	}

	&.tall {
		margin: 30px 0;
	}
	&.tall-top {
		margin-top: 30px;
	}
	.sha {
		margin-left: auto;
		padding-left: 10px;
	}
	.cs-tag {
		margin-left: 5px;
		margin-right: 0;
	}
	.icon {
		flex-grow: 0;
		flex-shrink: 0;
		margin-right: 10px;
		background: var(--app-background-color);
		display: flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		height: 18px;
		svg {
			opacity: 0.7;
		}
		&.circled {
			margin-top: -4px;
			height: 30px;
			background: #ddd;
			.vscode-dark & {
				background: #333;
			}
			border-radius: 15px;
			svg {
				opacity: 1;
			}
			border: 3px solid var(--app-background-color);
			&.red {
				color: white;
				background: #d73a4a;
			}
			&.green {
				color: white;
				background: #7aba5d;
			}
			&.gray {
				color: white;
				background: rgba(0, 0, 0, 0.75);
				.vscode-dark & {
					background: rgba(255, 255, 255, 0.75);
					color: black;
				}
			}
			&.purple {
				color: white;
				background-color: #6f42c1;
			}
		}
	}
	.monospace {
		color: var(--text-color-subtle);
		.emoji {
			color: var(--text-color-highlight);
		}
	}
	.left-pad {
		padding-left: 5px;
	}
`;

export const PRTimelineItemBody = styled.div`
	flex-grow: 10;
	${PRHeadshotName} {
		color: var(--text-color-highlight);
		font-weight: bold;
		padding-right: 5px;
	}
`;

export const PRContent = styled.div`
	padding: 0 20px 20px 20px;
	display: flex;
	// width: 100%;
	.main-content {
		flex-grow: 10;
		max-width: 75vw;
	}
	@media only screen and (max-width: 630px) {
		flex-direction: column;
		.main-content {
			order: 2;
			max-width: 100vw;
			${PRComment} ${PRHeadshot}, 
			${PRComment} ${Headshot}, 
			${PRStatusHeadshot} {
				display: none;
			}
			${PRActionCommentCard},
			${PRCommentCard} {
				margin-left: 0;
				&:before {
					display: none;
				}
			}
			${PRThreadedCommentCard} {
				margin-left: 30px;
			}
			${PRConversation}:before {
				left: 16px;
			}
			${PRTimelineItem} {
				padding-left: 3px;
			}
			.threaded {
				margin-left: 0;
			}
			.outline {
				margin-left: 30px !important;
			}
		}
	}
`;

export const PRSection = styled.div`
	padding: 10px 0;
	position: relative;
	font-size: 12px;
	border-bottom: 1px solid var(--base-border-color);
	color: var(--text-color-subtle);
	h1 {
		font-weight: 600;
		font-size: 12px;
		margin: 0 0 8px 0;
		padding: 0;
		.icon.settings {
			float: right;
			display: inline-block;
			transform: scale(0.8);
			opacity: 0.7;
		}
	}
	button {
		width: 100%;
		margin-bottom: 5px;
		.icon {
			vertical-align: 1px;
		}
	}
	a {
		color: var(--text-color-subtle);
		text-decoration: none;
		&:hover {
			color: var(--text-color-info);
		}
	}
	${TextButton}:hover {
		color: var(--text-color-info);
	}
`;

export const PRSidebar = styled.div`
	flex-grow: 0;
	display: flex;
	flex-direction: column;
	@media only screen and (max-width: 630px) {
		flex-direction: row;
		flex-wrap: wrap;
		width: auto;
		order: 1;
		margin-left: 0;
		margin-right: 0;
		padding-left: 0;
		padding-top: 0;
		${PRSection} {
			flex: 1 0 0;
			width: 1fr;
			min-width: 150px;
			margin: 0 10px 10px 0;
			margin: 0 -1px -1px 0;
			border: 1px solid var(--base-border-color) !important;
			padding: 5px;
		}
	}
	width: 225px;
	padding-left: 30px;
	a {
		color: var(--text-color-subtle);
		text-decoration: none;
		&:hover {
			color: var(--text-color-info);
		}
	}
`;

export const PRCommentHeader = styled.div`
	padding: 10px 15px 10px 15px;
	margin: -10px -15px 0 -15px;
	border-bottom: 1px solid var(--base-border-color);
	background: var(--base-background-color);
	display: flex;
	align-items: top;
	border-radius: 4px 4px 0 0;
`;

export const PRCommentBody = styled.div`
	padding: 15px 0 5px 0;
`;

export const PRThreadedCommentHeader = styled.div`
	display: flex;
	align-items: top;
	margin-bottom: 8px;
	// padding: 10px 15px 10px 15px;
	// margin: -10px -15px 0 -15px;
	// border-bottom: 1px solid var(--base-border-color);
	// background: var(--base-background-color);
	// display: flex;
	// align-items: top;
`;

// const PRCard = styled.div`
// 	border: 1px solid var(--base-border-color);
// 	background: var(--base-background-color);
// 	margin-left: 60px;
// 	padding: 15px 10px;
// `;

export const PRStatusIcon = styled.div`
	.icon {
		flex-shrink: 0;
		margin: 0 10px;
	}
`;

export const ButtonRow = styled.div`
	display: flex;
	align-items: center;
	button + button {
		margin-left: 10px;
	}
	button {
		margin-top: 10px;
	}
`;

// const PRSystem = styled.div`
// 	position: relative;
// 	padding: 20px 0 0 0;
// 	margin-left: 60px;
// 	background: var(--app-background-color);
// 	z-index: 3;
// `;

export const PRFoot = styled.div`
	border-top: 4px solid var(--base-border-color);
	background: var(--app-background-color);
	margin-top: 30px;
`;

export const PRActionIcons = styled.div`
	margin-left: auto;
	align-items: flex-start;
	text-align: right;
	display: flex;
	.pending,
	.member,
	.author {
		display: inline-block;
		flex-grow: 0;
		height: auto;
		border: 1px solid var(--base-border-color);
		border-radius: 10px;
		padding: 1px 7px;
		font-size: smaller;
		color: var(--text-color-subtle);
		display: flex;
	}
	.pending {
		border-color: ${PENDING_BORDER_COLOR};
		background: ${PENDING_BACKGROUND_COLOR};
	}
	div + div {
		margin-left: 5px;
	}
	.icon {
		opacity: 0.5;
		margin-left: 10px;
	}
`;

export const PRIconButton = styled.div`
	display: flex;
	flex-shrink: 0;
	justify-content: center;
	align-items: center;
	width: 30px;
	height: 30px;
	border-radius: 15px;
	&.gray-background .icon,
	&.red-background .icon,
	&.green-background .icon {
		color: white;
	}
`;

export const PRCodeCommentPatch = styled.div`
	margin: 10px -15px 15px -15px;
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
	.codemark.inline & {
		margin 10px 0;
		border: 1px solid var(--base-border-color);
	}
`;

export const PRCodeCommentBody = styled.div`
	min-height: 30px;
	margin: 0 0 20px 0;
	position: relative;
	padding-left: 40px;
`;

export const PRCodeComment = styled.div`
	flex-grow: 10;
	max-width: 100%;
	pre.code {
		margin: 10px -16px !important;
	}
	& + & {
		margin-top: 15px;
	}
	.octicon-file {
		display: inline-block;
		vertical-align: 2px;
		margin-right: 5px;
	}
	bdi.link {
		cursor: pointer;
	}
`;

export const PRCodeCommentReply = styled.div`
	position: relative;
	#input-div {
		height: 28px !important; // 2px for the border, 30px matches headshot height
		min-height: 28px !important;
		padding: 5px !important;
	}
	.open-comment #input-div {
		min-height: 100px !important;
	}
`;

export const PRCodeCommentReplyPlaceholder = styled.div`
	border: 1px solid var(--base-border-color);
`;

export const PRStatus = styled.div`
	display: flex;
	width: 100%;
	justify-content: center;
	align-items: center;
	margin: 10px 0 20px 0;

	@media only screen and (max-width: 450px) {
		flex-wrap: wrap;
		${PRStatusMessage} {
			order: 1;
			width: 100%;
			margin-bottom: 10px;
		}
		${PRStatusButton} {
			order: 2;
			// max-width: 40%;
			flex-grow: 0;
			margin-right: auto;
		}
		${PRActionButtons} {
			order: 3;
			// max-width: 40%;
			flex-grow: 0;
			margin-left: auto;
		}
	}
`;

export const PRReviewer = styled.div`
	display: flex;
	.status {
		flex-grow: 10;
		margin-left: auto;
		text-align: right;
		.icon {
			display: inline-block;
			transform: scale(0.8);
		}
		.icon + .icon {
			margin-left: 5px;
		}
		.approved {
			color: #66aa66;
		}
		.rejected {
			color: #cc3366;
		}
		b {
			display: inline-block;
			width: 8px;
			height: 8px;
			margin: 6px 4px 0 0;
			border-radius: 4px;
			&.pending {
				background: #dbab09;
			}
		}
	}
`;

export const PRCloneURLButtons = styled.div`
	display: inline-flex;
	border-radius: 5px;
	overflow: hidden;
	margin-right: 5px;
	> button {
		margin-left: 1px;
	}
`;
export const PRCloneURL = styled.div`
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: space-between;
	border: 1px solid var(--base-border-color);
	border-radius: 5px;
	padding: 5px 0 5px 5px;
	input {
		flex: 1;
		background: none !important;
	}
	.icon {
		margin: 0 10px;
	}
`;

export const PRCloneURLWrapper = styled.div`
	display: flex;
	@media only screen and (max-width: 630px) {
		flex-direction: column;
		${PRCloneURLButtons} {
			margin-bottom: 1em;
		}
	}
`;

export const PRCopyableTerminal = styled.div`
	position: relative;
	code {
		width: 100%;
	}
	pre {
		width: 100%;
	}
	.icon {
		position: absolute !important;
		top: 10px;
		right: 10px;
	}
`;

export const PRResolveConflictsRow = styled.div`
	display: flex;
	align-items: flex-start;
	button {
		flex-grow: 0;
		flex-shrink: 0;
		margin-left: auto;
	}
	.middle {
		margin: 0 10px;
	}
`;

export const PRResolveConflicts = styled.div`
	padding: "5px 0";
	${PRResolveConflictsRow} {
		padding-bottom: 10px;
		margin-bottom: 10px;
		border-bottom: 1px solid;
		border-color: var(--base-border-color);
	}
	${PRResolveConflictsRow}:last-child {
		padding-bottom: 0px;
		margin-bottom: 0px;
		border: none;
	}
`;

export const PRHeadshots = styled.div`
	margin-bottom: -5px;
	${PRHeadshot} {
		margin: 0 5px 5px 0;
	}
`;

export const PRIAmRequested = styled.div`
	display: flex;
	align-items: center;
	margin: 0 0 10px 0;
	padding: 10px;
	border-radius: 5px;
	border: 1px solid ${PENDING_BORDER_COLOR};
	background: ${PENDING_BACKGROUND_COLOR};
	button {
		border-radius: 5px;
		margin-left: auto;
	}
`;
