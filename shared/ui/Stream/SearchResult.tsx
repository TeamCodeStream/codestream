import React from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import * as userSelectors from "../store/users/reducer";
import Icon from "./Icon";
import { ReviewPlus } from "../protocols/agent/agent.protocol.reviews";
import Tag from "./Tag";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { CodeStreamState } from "../store";
import { markdownify } from "./Markdowner";
import { setCurrentReview, setCurrentCodemark } from "../store/context/actions";
import { HeadshotName } from "../src/components/HeadshotName";
import { CodemarkPlus } from "@codestream/protocols/agent";
import { isCSReview } from "../protocols/agent/api.protocol.models";
import { Marker } from "./Marker";
import { ChangesetFileList } from "./Review/ChangesetFileList";

const RootTR = styled.tr`
	margin: 0;
	&.archived td {
		opacity: 0.5;
	}
	p {
		display: inline;
		margin: 0;
	}
	:hover {
		background: var(--app-background-color-hover);
	}
	td:nth-child(1) {
		vertical-align: top;
		padding: 8px 5px 5px 20px;
		width: 20px;
		.icon {
			display: inline-block;
			transform: scale(1.25);
		}
	}
	// title & info
	td:nth-child(2) {
		vertical-align: top;
		padding: 5px;
	}
	// headshots (which have right padding)
	td:nth-child(3) {
		text-align: left;
		padding: 5px 0 0 0;
	}
	// comments
	td:nth-child(4) {
		white-space: nowrap;
		text-align: center;
		padding: 5px 10px 5px 0;
	}
	td {
		@media only screen and (max-width: 430px) {
			font-size: 12px;
			//$//{HeadshotName} {
			//	padding-right: 5px;
			//}
			.headshot-name {
				display: none;
			}
		}
		@media only screen and (max-width: 350px) {
			font-size: 11px;
		}
		@media only screen and (max-width: 270px) {
			font-size: 10px;
		}
	}
`;

export const HeaderRow = styled.div`
	display: flex;
	:nth-child(1) .icon {
		display: inline-block;
		transform: scale(1.25);
		padding: 3px 8px 3px 3px;
		height: 16px;
	}
`;

export const Title = styled.div`
	p {
		display: inline;
		margin: 0;
	}
	font-size: larger;
	cursor: pointer;
`;

export const TitleDetails = styled.div`
	opacity: 0.5;
`;

const Tip = styled.div`
	max-width: 30em;
	.code.prettyprint {
		max-width: 30em !important;
		overflow: auto;
		border: 1px solid var(--base-border-color);
		background: var(--base-background-color);
	}
	p {
		display: inline;
		margin: 0;
	}
`;

interface Props {
	result: ReviewPlus | CodemarkPlus;
	titleOnly?: boolean;
	query?: string;
	onClick?: Function;
	fullTitle?: boolean;
}

export default function SearchResult(props: Props) {
	const { result } = props;
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentUserId: state.session.userId!,
			teamTagsHash: userSelectors.getTeamTagsHash(state),
			usernames: userSelectors.getUsernamesById(state)
		};
	});

	const selectResult = () => {
		if (isCSReview(result)) dispatch(setCurrentReview(result.id));
		else dispatch(setCurrentCodemark(result.id));
	};

	const buildTip = () => {
		if (isCSReview(result)) {
			return <ChangesetFileList noOnClick showRepoLabels review={result} />;
		} else {
			// @ts-ignore
			const markers = result.markers || [];
			return (
				<Tip>
					{!props.fullTitle && <span dangerouslySetInnerHTML={{ __html: titleHTML }} />}
					{markers.map(marker => (
						<Marker marker={marker} />
					))}
				</Tip>
			);
		}
	};
	
	function escapeRegExp(str: string) {
		return str?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	let review: ReviewPlus | undefined = undefined;
	let type: string;
	let isArchived: boolean;
	let assignees: string[];
	if (isCSReview(result)) {
		review = result;
		type = "review";
		isArchived = false;
		assignees = review.reviewers || [];
	} else {
		type = result.type;
		isArchived = result.pinned ? false : true;
		assignees = result.assignees || [];
	}
	// be sure to make a copy of the array so we don't update the redux store itself
	assignees = [...assignees];

	// put yourself at the front
	const myPosition = assignees.indexOf(derivedState.currentUserId);
	if (myPosition > -1) assignees.unshift(assignees.splice(myPosition, 1)[0]);

	const text = props.fullTitle ? result.text || "" : (result.text || "").substr(0, 80);
	let titleHTML = markdownify(type === "comment" ? text : result.title);
	if (props.query) {
		const matchQueryRegexp = new RegExp(escapeRegExp(props.query), "gi");
		titleHTML = titleHTML.replace(matchQueryRegexp, "<u><b>$&</b></u>");
	}

	let icon;
	let titleTip = buildTip(); // = result.text ? <div style={{ maxWidth: "25em" }}>{result.text}</div> : undefined;
	let createdVerb = "Opened";
	switch (type) {
		case "review":
			icon = "review";
			break;
		case "issue":
			icon = "issue";
			break;
		default:
			icon = "comment";
			createdVerb = "Posted";
			break;
	}

	let status = result.status;
	if (
		review &&
		status === "open" &&
		review.allReviewersMustApprove &&
		review.reviewers.length > 1
	) {
		const approvals = Object.keys(review.approvedBy || {}).length;
		status += ` (${approvals}/${review.reviewers.length})`;
	}

	const title = (
		<>
			<Tooltip title={titleTip} placement="top" delay={1}>
				<Title>
					<span dangerouslySetInnerHTML={{ __html: titleHTML }} />
					&nbsp;
					{(result.tags || []).map(tagId => {
						const tag = derivedState.teamTagsHash[tagId];
						return tag ? <Tag tag={tag} /> : null;
					})}
				</Title>
			</Tooltip>
			<TitleDetails>
				{createdVerb}
				<Timestamp relative time={result.createdAt} /> by {derivedState.usernames[result.creatorId]}{" "}
				{status && <>&middot; {status} </>}
				{isArchived && <>&middot; archived </>}
			</TitleDetails>
		</>
	);

	if (props.titleOnly) return title;

	return (
		<RootTR onClick={selectResult} className={isArchived ? "archived" : ""}>
			<td>
				<Icon name={icon} />
			</td>
			<td>{title}</td>
			<td>
				{assignees.map(id => {
					const isMe = id === derivedState.currentUserId;
					const addThumbsUp = !!(review && review.approvedBy && review.approvedBy[id]);
					return (
						<HeadshotName id={id} size={20} highlightMe addThumbsUp={addThumbsUp} noName={!isMe} />
					);
				})}
			</td>
			<td>
				{result.numReplies > 0 && (
					<>
						<Icon name="comment" /> {result.numReplies}
					</>
				)}
			</td>
		</RootTR>
	);
}
