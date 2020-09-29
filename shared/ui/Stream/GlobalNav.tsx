import React from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { CSMe } from "../protocols/agent/api.protocol.models";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import Icon from "./Icon";
import Tooltip, { TipTitle, placeArrowTopRight } from "./Tooltip";
import { Link } from "./Link";
import cx from "classnames";
import { getCodeCollisions } from "../store/users/reducer";
import { EMPTY_STATUS } from "./StartWork";
import { openPanel } from "./actions";
import { PlusMenu } from "./PlusMenu";
import { EllipsisMenu } from "./EllipsisMenu";
import {
	setCurrentReview,
	clearCurrentPullRequest,
	setCreatePullRequest
} from "../store/context/actions";
import CancelButton from "./CancelButton";
import { setCurrentCodemark } from "../store/context/actions";
import { HostApi } from "../webview-api";
import { ReviewCloseDiffRequestType } from "@codestream/protocols/webview";

const sum = (total, num) => total + Math.round(num);

export function GlobalNav() {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { umis, preferences = {} } = state;
		const currentUser = state.users[state.session.userId!] as CSMe;
		let status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;

		return {
			status,
			activePanel: state.context.panelStack[0],
			totalUnread: Object.values(umis.unreads).reduce(sum, 0),
			totalMentions: Object.values(umis.mentions).reduce(sum, 0),
			collisions: getCodeCollisions(state),
			composeCodemarkActive: state.context.composeCodemarkActive,
			currentReviewId: state.context.currentReviewId,
			currentCodemarkId: state.context.currentCodemarkId,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined
		};
	});

	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const [plusMenuOpen, setPlusMenuOpen] = React.useState();

	const {
		activePanel,
		totalUnread,
		totalMentions,
		collisions,
		currentCodemarkId,
		currentReviewId,
		currentPullRequestId
	} = derivedState;

	// this would be nice, but unfortunately scm is only loaded on spatial view so we can't
	// rely on it here
	// const { repoId, file } = this.props.currentScm || {};
	const hasFileConflict = false; // this.props.collisions.repoFiles[repoId + ":" + file];

	const umisClass = cx("umis", {
		mentions: totalMentions > 0,
		unread: totalMentions == 0 && totalUnread > 0
	});
	const totalUMICount = totalMentions ? (
		<div className="mentions-badge">{totalMentions > 99 ? "99+" : totalMentions}</div>
	) : totalUnread ? (
		<div className="unread-badge">.</div>
	) : null;

	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};

	const togglePlusMenu = event => {
		setPlusMenuOpen(plusMenuOpen ? undefined : event.target.closest("label"));
	};

	const go = panel => {
		close();
		dispatch(openPanel(panel));
	};

	const close = () => {
		dispatch(setCreatePullRequest());
		dispatch(clearCurrentPullRequest());
		dispatch(setCurrentReview());
		dispatch(setCurrentCodemark());
		if (currentReviewId) {
			// tell the extension to close the diff panel in the editor
			HostApi.instance.send(ReviewCloseDiffRequestType, {});
		}
	};

	// const selected = panel => activePanel === panel && !currentPullRequestId && !currentReviewId; // && !plusMenuOpen && !menuOpen;
	const selected = panel => false;
	return React.useMemo(() => {
		if (currentCodemarkId) return null;
		if (currentReviewId || currentPullRequestId) {
			return (
				<nav className="inline" id="global-nav">
					<label onClick={close}>
						<span>
							<CancelButton title="Close" onClick={close} />
						</span>
					</label>
				</nav>
			);
		} else if (activePanel === WebviewPanels.CodemarksForFile) {
			return (
				<nav className="inline" id="global-nav">
					<label onClick={close}>
						<span>
							<CancelButton title="Close" onClick={() => go(WebviewPanels.Sidebar)} />
						</span>
					</label>
				</nav>
			);
		} else {
			return (
				<nav className="inline" id="global-nav">
					<label
						className={cx({ active: plusMenuOpen })}
						onClick={togglePlusMenu}
						id="global-nav-plus-label"
					>
						<span>
							<Icon
								name="plus"
								title="Create..."
								placement="bottom"
								delay={1}
								trigger={["hover"]}
							/>
						</span>
						{plusMenuOpen && (
							<PlusMenu closeMenu={() => setPlusMenuOpen(undefined)} menuTarget={plusMenuOpen} />
						)}
					</label>
					{/*
					<label
						className={cx({
							selected: selected(WebviewPanels.Status) || selected(WebviewPanels.LandingRedirect)
						})}
						onClick={e => go(WebviewPanels.Status)}
						id="global-nav-status-label"
					>
						<Tooltip
							delay={1}
							trigger={["hover"]}
							title={
								<TipTitle>
									<h1>Your Tasks</h1>
									Assigned issues and code reviews.
									<br />
									This is home base for getting work done.
									<Link
										className="learn-more"
										href="https://docs.codestream.com/userguide/features/tasks"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottom"
						>
							<span>
								<Icon name="inbox" />
							</span>
						</Tooltip>
					</label>
					
					<label
						className={cx({ selected: selected(WebviewPanels.Sidebar) })}
						onClick={e => go(WebviewPanels.Sidebar)}
						id="global-nav-file-label"
					>
						<Tooltip
							delay={1}
							trigger={["hover"]}
							title={
								<TipTitle>
									<h1>Comments In Current File</h1>
									We call these <i>Codemarks</i>
									<Link
										className="learn-more"
										href="https://docs.codestream.com/userguide/workflow/discuss-code/"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottom"
						>
							<span>
								<Icon name="file" />
								{hasFileConflict && <Icon name="alert" className="nav-conflict" />}
							</span>
						</Tooltip>
					</label>
						*/}
					<label
						className={cx({ selected: selected(WebviewPanels.Activity) })}
						onClick={e => go(WebviewPanels.Activity)}
						id="global-nav-activity-label"
					>
						<Tooltip
							delay={1}
							trigger={["hover"]}
							title={
								<TipTitle>
									<h1>Activity Feed</h1>
									Latest comments, issues,
									<br />
									code reviews and replies.
									<Link
										className="learn-more"
										href="http://docs.codestream.com/userguide/features/activity-feed/"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottom"
						>
							<span>
								<Icon name="activity" />
								{<span className={umisClass}>{totalUMICount}</span>}
							</span>
						</Tooltip>
					</label>
					<label
						className={cx({ selected: selected(WebviewPanels.FilterSearch) })}
						onClick={() => go(WebviewPanels.FilterSearch)}
						id="global-nav-search-label"
					>
						<Icon
							name="search"
							delay={1}
							trigger={["hover"]}
							title={
								<TipTitle>
									<h1>Filter &amp; Search</h1>
									Search code comments, code reviews,
									<br />
									and codestream content.
									<Link
										className="learn-more"
										href="http://docs.codestream.com/userguide/features/filter-and-search/"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottomRight"
							onPopupAlign={placeArrowTopRight}
						/>
					</label>
					<label
						className={cx({ selected: selected(WebviewPanels.Flow) })}
						onClick={e => go(WebviewPanels.Flow)}
						id="global-nav-file-label"
					>
						<Tooltip delay={1} trigger={["hover"]} title="Help &amp; Info" placement="bottom">
							<span>
								<Icon name="question" />
							</span>
						</Tooltip>
					</label>
					{/*<label
						className={cx({ selected: selected(WebviewPanels.Team) })}
						onClick={e => go(WebviewPanels.Team)}
						id="global-nav-team-label"
					>
						<Tooltip
							delay={1}
							trigger={["hover"]}
							title={
								<TipTitle>
									<h1>Your Team</h1>
									View status and local changes
									<br />
									from your teammates.
									<Link
										className="learn-more"
										href="http://docs.codestream.com/userguide/features/team-live-view/"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottomRight"
							onPopupAlign={placeArrowTopRight}
						>
							<span>
								<Icon name="team" />
								{collisions.nav && <Icon name="alert" className="nav-conflict" />}
							</span>
						</Tooltip>
						</label>*/}
					<label
						onClick={toggleEllipsisMenu}
						className={cx({ active: ellipsisMenuOpen })}
						id="global-nav-more-label"
					>
						<span>
							<Icon
								name="kebab-horizontal"
								delay={1}
								trigger={["hover"]}
								title="More Actions..."
								placement="bottomRight"
							/>
						</span>
						{ellipsisMenuOpen && (
							<EllipsisMenu
								closeMenu={() => setEllipsisMenuOpen(undefined)}
								menuTarget={ellipsisMenuOpen}
							/>
						)}
					</label>
				</nav>
			);
		}
	}, [
		derivedState.status.label,
		activePanel,
		totalUnread,
		totalMentions,
		collisions.nav,
		derivedState.composeCodemarkActive,
		currentReviewId,
		currentPullRequestId,
		currentCodemarkId,
		plusMenuOpen,
		ellipsisMenuOpen
	]);
}
