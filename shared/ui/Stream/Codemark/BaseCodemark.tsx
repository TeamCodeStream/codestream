import { CodemarkPlus } from "@codestream/protocols/agent";
import { CodemarkStatus, CodemarkType, CSMarker, CSPost, CSUser } from "@codestream/protocols/api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import cx from "classnames";
import React from "react";
import styled from "styled-components";
import {
	Card,
	CardBanner,
	CardBody,
	CardFooter,
	CardProps,
	getCardProps,
} from "../../src/components/Card";
import { setCodemarkStatus } from "../actions";
import { PROVIDER_MAPPINGS } from "../CrossPostIssueControls/types";
import { DropdownButton } from "../DropdownButton";
import Icon from "../Icon";
import { Link } from "../Link";
import { MarkdownText } from "../MarkdownText";
import { Marker } from "../Marker";
import { AddReactionIcon, Reactions } from "../Reactions";
import Tag from "../Tag";
import Tooltip from "../Tooltip";

export interface BaseCodemarkProps extends CardProps {
	codemark: CodemarkPlus;
	author: CSUser;
	collapsed?: boolean;
	isFollowing?: boolean;
	tags?: { id: string }[];
	assignees?: Partial<CSUser>[];
	currentUserEmail?: string;
	providerDisplay?: (typeof PROVIDER_MAPPINGS)[string];
	relatedCodemarks?: any[];
	pinnedReplies?: any;
	onChangeStatus?(status: CodemarkStatus): void;
	// A menu icon is only displayed if this function returns non-nil
	renderMenu?: (target: any, onClose: () => void) => React.ReactNode;
	// if we want to pass the items rather than a render function
	menuItems?: any[];
	// A value of false will hide markers completely. The function can return it's own rendering or null
	renderMarkers?: boolean | ((markers: CSMarker[]) => React.ReactNode);
	// The <CardFooter/> is provided to allow overriding the container style and it must be the returned child
	renderFooter?: (footer: typeof CardFooter) => React.ReactNode;
	renderActions?: boolean;
	noCard?: boolean;
	post?: CSPost;
}

export function BaseCodemark(props: BaseCodemarkProps) {
	const [menuState, setMenuState] = React.useState<{ open: boolean; target?: any }>({
		open: false,
		target: undefined,
	});

	const dispatch = useAppDispatch();

	const { codemark, menuItems = [] } = props;

	const hasTags = props.tags && props.tags.length > 0;
	const hasAssignees = props.assignees && props.assignees.length > 0;
	const hasRelatedCodemarks = props.relatedCodemarks && props.relatedCodemarks.length > 0;

	const renderActions = props.renderActions == undefined ? true : props.renderActions;

	const renderedMenu =
		props.renderMenu &&
		menuState.open &&
		props.renderMenu(menuState.target, () => setMenuState({ open: false }));

	const renderedMarkers = (() => {
		if (codemark.markers == undefined || props.renderMarkers === false) return null;

		if (props.renderMarkers == undefined || props.renderMarkers === true)
			return codemark.markers.map(marker => <StyledMarker key={marker.id} marker={marker} />);

		return props.renderMarkers(codemark.markers);
	})();

	const renderedFooter = props.renderFooter ? props.renderFooter(CardFooter) : null;

	const renderEmote = () => {
		let matches = (codemark.text || "").match(/^\/me\s+(.*)/);
		if (matches) return <span className="emote">{matches[1]}</span>;
		else return null;
	};
	const emote = renderEmote();

	let { collapsed } = props;
	// collapsed = false;

	const resolve = () => {
		dispatch(setCodemarkStatus(codemark.id, CodemarkStatus.Closed));
		HostApi.instance.track("Codemark Resolved", {
			"Codemark ID": codemark.id,
			"Codemark Type": codemark.type,
			Archived: false,
		});
	};

	const reopen = () => dispatch(setCodemarkStatus(codemark.id, CodemarkStatus.Open));

	const resolveItem = { label: "Resolve", action: resolve };
	const reopenItem = { label: "Reopen", action: reopen };

	const renderIssueDropdownAndMenu = renderActions && codemark.type === CodemarkType.Issue;
	const menu = (
		<HeaderActions>
			{props.post && <AddReactionIcon post={props.post} />}
			{renderIssueDropdownAndMenu &&
				(codemark.status === CodemarkStatus.Closed ? (
					<DropdownButton
						size="compact"
						variant="secondary"
						items={[reopenItem, { label: "-" }, ...menuItems]}
					>
						Resolved
					</DropdownButton>
				) : (
					<DropdownButton size="compact" items={[resolveItem, { label: "-" }, ...menuItems]}>
						Open
					</DropdownButton>
				))}
			{!renderIssueDropdownAndMenu && renderedMenu}
			{!renderIssueDropdownAndMenu && props.renderMenu && (
				<KebabIcon
					className="kebab"
					onClickCapture={e => {
						e.preventDefault();
						e.stopPropagation();
						if (menuState.open) {
							setMenuState({ open: false });
						} else {
							setMenuState({ open: true, target: e.currentTarget });
						}
					}}
				>
					<Icon name="kebab-vertical" className="clickable" />
				</KebabIcon>
			)}
		</HeaderActions>
	);

	return (
		<Card {...getCardProps(props)}>
			<CardBanner>
				{!codemark.pinned && <div>This codemark is archived.</div>}
				{codemark.status == "closed" && <div>This codemark is resolved.</div>}
			</CardBanner>
			<CardBody>
				{collapsed && codemark.type === CodemarkType.Issue ? (
					<Header>
						<Icon name="issue" className="type" />
						<BigTitle>
							{menu}
							<MarkdownText text={codemark.title || codemark.text} />
						</BigTitle>
					</Header>
				) : (
					<Title>
						{menu}
						<MarkdownText text={codemark.title || codemark.text} />
					</Title>
				)}
				{props.post && (
					<div style={{ marginBottom: "10px" }}>
						<Reactions className="reactions no-pad-left" post={props.post} />
					</div>
				)}
				{!collapsed && (
					<>
						<MetaSection>
							{(hasTags || hasAssignees) && (
								<MetaRow>
									{hasTags && (
										<Meta>
											<MetaLabel>Tags</MetaLabel>
											<MetaDescriptionForTags>
												{props.tags!.map(tag => (
													<Tag tag={tag} key={tag.id} />
												))}
											</MetaDescriptionForTags>
										</Meta>
									)}
									{hasAssignees && (
										<Meta>
											<MetaLabel>Assignees</MetaLabel>
											<MetaDescriptionForTags>
												{props.assignees!.map(assignee => (
													<MetaAssignee key={assignee.username || assignee.email}>
														<Headshot person={assignee as any} size={18} />
														<span
															className={cx({
																"at-mention me":
																	assignee.email != undefined &&
																	assignee.email === props.currentUserEmail,
															})}
														>
															{assignee.username || assignee.email}
														</span>
													</MetaAssignee>
												))}
											</MetaDescriptionForTags>
										</Meta>
									)}
								</MetaRow>
							)}
							{codemark.title && codemark.text && (
								<Meta>
									<MetaLabel>Description</MetaLabel>
									<MetaDescription>
										<Icon name="description" />
										<MarkdownText text={codemark.text} />
									</MetaDescription>
								</Meta>
							)}
							{props.providerDisplay && (
								<Meta>
									<MetaLabel>Linked Issues</MetaLabel>
									<LinkForExternalUrl href={codemark.externalProviderUrl}>
										<MetaDescription>
											{props.providerDisplay.icon && <Icon name={props.providerDisplay.icon} />}
											<span>{props.providerDisplay.displayName}</span>
											<span style={{ opacity: 0.5 }}>{codemark.externalProviderUrl}</span>
										</MetaDescription>
									</LinkForExternalUrl>
								</Meta>
							)}
							{hasRelatedCodemarks && (
								<Meta>
									<MetaLabel>Related</MetaLabel>
									{props.relatedCodemarks}
								</Meta>
							)}
							{props.pinnedReplies && (
								<Meta>
									<MetaLabel>Starred Replies</MetaLabel>
									{props.pinnedReplies}
								</Meta>
							)}
						</MetaSection>
						{renderedMarkers}
					</>
				)}
				{collapsed && (
					<>
						{props.pinnedReplies && (
							<div style={{ marginBottom: "10px" }}>
								<Meta>{props.pinnedReplies}</Meta>
							</div>
						)}
						<MetaSectionCollapsed>
							{hasTags && (
								<>
									{props.tags!.map(tag => (
										<Tag tag={tag} key={tag.id} />
									))}
									<div style={{ width: "5px" }} />
								</>
							)}
							{props.isFollowing && (
								<span>
									<Icon
										className="detail-icon"
										title="You are following this codemark"
										placement="bottomRight"
										align={{ offset: [22, 4] }}
										name="eye"
									/>
								</span>
							)}
							{props.providerDisplay && props.providerDisplay.icon && (
								<span
									className="detail-icon"
									onClickCapture={e => {
										e.preventDefault();
										e.stopPropagation();
										HostApi.instance.send(OpenUrlRequestType, {
											url: codemark.externalProviderUrl!,
										});
									}}
								>
									<Icon
										title={"Open on " + props.providerDisplay.displayName}
										placement="bottom"
										name={props.providerDisplay.icon}
									/>
								</span>
							)}
							{codemark.title && codemark.text && (
								<span className="detail-icon">
									<Icon title="Show description" placement="bottom" name="description" />
								</span>
							)}
							{props.post && props.post.files && props.post.files.length > 0 && (
								<span className="detail-icon">
									<Icon title="Show attachments" placement="bottom" name="paperclip" />{" "}
									{props.post.files.length}
								</span>
							)}
							{codemark.markers && codemark.markers.length > 1 && (
								<Tooltip title="Multiple code locations" placement="bottom">
									<span className="detail-icon">
										<Icon name="code" /> {codemark.markers.length}
									</span>
								</Tooltip>
							)}
							{hasRelatedCodemarks && (
								<Tooltip title="Show related codemarks" placement="bottom">
									<span className="detail-icon">
										<Icon name="codestream" /> {codemark.relatedCodemarkIds!.length}
									</span>
								</Tooltip>
							)}
							{codemark.numReplies > 0 && (
								<Tooltip title="Show replies" placement="bottom">
									<span className="detail-icon">
										<Icon name="comment" /> {codemark.numReplies}
									</span>
								</Tooltip>
							)}
							{hasAssignees && (
								<MetaSectionCollapsedHeadshotArea>
									{props.assignees!.map((assignee, i) => {
										const isMe = assignee.email === props.currentUserEmail;
										return (
											<Tooltip
												key={i}
												title={`Assigned to ${assignee.fullName || assignee.username}`}
												placement="bottomRight"
												align={{ offset: [17, 4] }}
											>
												<span>
													<Headshot person={assignee as any} size={20} />
												</span>
											</Tooltip>
										);
									})}
								</MetaSectionCollapsedHeadshotArea>
							)}
						</MetaSectionCollapsed>
					</>
				)}
			</CardBody>
			{renderedFooter}
		</Card>
	);
}

export const MinimumWidthCard = styled(Card)`
	min-width: 60px;
`;

export const Header = styled.div`
	width: 100%;
	margin-bottom: 10px;
	display: flex;
	align-items: flex-start;
	font-size: 13px;
	.icon.type {
		display: inline-block;
		transform: scale(1.25);
		padding: 3px 8px 3px 3px;
	}
	button {
		margin-left: 10px;
	}
`;

export const HeaderActions = styled.div`
	float: right;
	// & > *:not(:last-child) {
	// 	margin: 0 5px;
	// }
	${AddReactionIcon} {
		opacity: 0.5;
		vertical-align: -1px;
		&:hover {
			opacity: 1;
		}
		&.in-review {
			vertical-align: -3px;
		}
	}
`;

export const AuthorInfo = styled.div`
	display: flex;
	align-items: center;
	${Headshot} {
		margin-right: 7px;
	}
`;

export const Title = styled.div`
	margin-bottom: 10px;
`;

export const BigTitle = styled.div`
	font-size: larger;
	color: var(--text-color-highlight);
	flex-grow: 10;
	word-wrap: break-word;
`;

export const Meta = styled.div`
	display: flex;
	flex-direction: column;
	margin-right: auto;
	width: 100%;
`;

export const MetaSection = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	${Meta} {
		padding: 10px 0;
	}
`;

export const MetaSectionCollapsedHeadshotArea = styled.div`
	display: flex;
	> span {
		margin-right: 10px;
	}
	> span:last-child {
		margin-right: 0;
	}
`;

export const MetaSectionCollapsed = styled.div`
	padding: 5px 1px;
	display: flex;
	flex-flow: row wrap;
	align-items: center;
	color: var(--text-color);
	> span {
		margin-right: 10px;
	}

	.detail-icon {
		opacity: 0.4;
		cursor: pointer;
		user-select: none;
		&:hover {
			opacity: 1;
		}
		.icon {
			color: var(--text-color);
		}
		.octicon-comment {
			margin-top: 1px;
		}
	}

	.cs-tag {
		cursor: pointer;
		margin-bottom: 0px;
		&:last-of-type {
			margin-right: ;
		}
	}

	${MetaSectionCollapsedHeadshotArea} {
		margin-left: auto;
	}
`;

export const MetaRow = styled.div`
	display: flex;
	flex-flow: row wrap;
	${Meta} {
		width: auto;
	}
`;

export const MetaLabel = styled.div`
	text-transform: uppercase;
	font-weight: 800;
	opacity: 0.7;
	color: var(--text-color-subtle);
	font-size: 11px;
	margin-bottom: 3px;
	button {
		text-transform: uppercase;
		font-weight: 800;
		color: var(--text-color-subtle);
	}
`;

export const MetaDescription = styled.div`
	display: flex;
	> *:not(:first-child) {
		margin-left: 5px;
	}
`;

export const MetaDescriptionForAssignees = styled.div`
	display: flex;
	flex-direction: column;
	> *:not(:last-child) {
		margin-bottom: 5px;
	}
`;

export const MetaDescriptionForTags = styled.div`
	display: flex;
	flex-flow: row wrap;
	> *:not(:last-child) {
		margin-right: 5px;
	}
`;

export const MetaAssignee = styled.div`
	display: flex;
	${Headshot} {
		margin-right: 5px;
	}
`;

const LinkForExternalUrl = styled(Link)`
	color: var(--text-color);
	text-decoration: none !important;
	&:hover {
		color: var(--text-color-info);
	}
	${MetaDescription} {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`;

export const StyledMarker = styled(props => <Marker {...props} />)`
	.code {
		margin: 5px 0 !important;
	}
	.file-info {
		font-size: 11px;
		display: flex;
		flex-flow: row wrap;
	}
	.file-info .monospace {
		display: block;
		white-space: nowrap;
	}
	.icon {
		vertical-align: 2px;
	}
	a {
		text-decoration: none;
	}
`;

export const ActionButton = styled.div`
	border: 1px solid var(--base-border-color);
	padding: 2px 10px;
	cursor: pointer;
	color: var(--text-color);
	font-weight: normal;
	&:hover {
		color: var(--button-foreground-color);
		background: var(--button-background-color);
		border: 1px solid var(--button-background-color);
	}
`;

export const KebabIcon = styled.span`
	.icon.clickable {
		opacity: 0.5;
		margin-left: 7px;
		// to align vertically with the DropdownButton
		vertical-align: -2px;
		padding: 0 5px;
	}
`;
