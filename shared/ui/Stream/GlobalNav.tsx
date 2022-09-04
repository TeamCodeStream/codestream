import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import Icon from "./Icon";
import Tooltip, { TipTitle, placeArrowTopRight } from "./Tooltip";
import { Link } from "./Link";
import cx from "classnames";
import { openPanel, setUserPreference } from "./actions";
import { PlusMenu } from "./PlusMenu";
import { TeamMenu } from "./TeamMenu";
import { EllipsisMenu } from "./EllipsisMenu";
import {
	setCurrentReview,
	clearCurrentPullRequest,
	setCreatePullRequest,
} from "../store/context/actions";
import { setCurrentCodemark } from "../store/context/actions";
import { HostApi } from "../webview-api";
import {
	LocalFilesCloseDiffRequestType,
	ReviewCloseDiffRequestType,
} from "@codestream/protocols/webview";
import { HeadshotName } from "../src/components/HeadshotName";

const sum = (total, num) => total + Math.round(num);

export function GlobalNav() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { umis, preferences } = state;

		return {
			clickedPlus: preferences.clickedPlus,
			clickedInvite: preferences.clickedInvite,
			currentUserId: state.session.userId,
			activePanel: state.context.panelStack[0],
			totalUnread: Object.values(umis.unreads).reduce(sum, 0),
			totalMentions: Object.values(umis.mentions).reduce(sum, 0),
			composeCodemarkActive: state.context.composeCodemarkActive,
			currentReviewId: state.context.currentReviewId,
			currentCodeErrorId: state.context.currentCodeErrorId,
			currentCodemarkId: state.context.currentCodemarkId,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
		};
	});

	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const [plusMenuOpen, setPlusMenuOpen] = React.useState();
	const [teamMenuOpen, setTeamMenuOpen] = React.useState();

	const {
		activePanel,
		totalUnread,
		totalMentions,
		currentCodemarkId,
		currentReviewId,
		currentCodeErrorId,
		currentPullRequestId,
	} = derivedState;

	const umisClass = cx("umis", {
		mentions: totalMentions > 0,
		unread: totalMentions == 0 && totalUnread > 0,
	});
	const totalUMICount = totalMentions ? (
		<div className="mentions-badge">{totalMentions > 99 ? "99+" : totalMentions}</div>
	) : totalUnread ? (
		<div className="unread-badge">.</div>
	) : null;

	const plusUMI = derivedState.clickedPlus ? null : <div className="unread-badge">.</div>;
	const teamUMI = derivedState.clickedInvite ? null : <div className="unread-badge">.</div>;

	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};

	const togglePlusMenu = event => {
		if (!derivedState.clickedPlus)
			dispatch(setUserPreference({ prefPath: ["clickedPlus"], value: true }));
		setPlusMenuOpen(plusMenuOpen ? undefined : event.target.closest("label"));
	};

	const toggleTeamMenu = event => {
		if (!derivedState.clickedInvite)
			dispatch(setUserPreference({ prefPath: ["clickedInvite"], value: true }));
		setTeamMenuOpen(teamMenuOpen ? undefined : event.target.closest("label"));
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
		if (currentPullRequestId) {
			HostApi.instance.send(LocalFilesCloseDiffRequestType, {});
		}
	};

	// const selected = panel => activePanel === panel && !currentPullRequestId && !currentReviewId; // && !plusMenuOpen && !menuOpen;
	const selected = panel => false;
	return React.useMemo(() => {
		if (currentCodemarkId) return null;
		else if (activePanel === WebviewPanels.Onboard) return null;
		else if (activePanel === WebviewPanels.OnboardNewRelic) return null;
		else {
			return (
				<nav className="inline" id="global-nav">
					<label
						onClick={toggleEllipsisMenu}
						className={cx({ active: false && ellipsisMenuOpen })}
						id="global-nav-more-label"
					>
						<HeadshotName id={derivedState.currentUserId} size={16} className="no-padding" />
						<Icon name="chevron-down" className="smaller" style={{ verticalAlign: "-2px" }} />
						{ellipsisMenuOpen && (
							<EllipsisMenu
								closeMenu={() => setEllipsisMenuOpen(undefined)}
								menuTarget={ellipsisMenuOpen}
							/>
						)}
					</label>

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
							<span className="unread">{plusUMI}</span>
						</span>
						{plusMenuOpen && (
							<PlusMenu closeMenu={() => setPlusMenuOpen(undefined)} menuTarget={plusMenuOpen} />
						)}
					</label>
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
									feedback requests and replies.
									<Link
										className="learn-more"
										href="https://docs.newrelic.com/docs/codestream/how-use-codestream/ui-overview/#ui-activity"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottomRight"
						>
							<span>
								<Icon name="activity" />
								<span className={umisClass}>{totalUMICount}</span>
							</span>
						</Tooltip>
					</label>
					<label
						className={cx({ active: teamMenuOpen })}
						onClick={toggleTeamMenu}
						id="global-nav-people-label"
					>
						<span>
							<Icon
								name="team"
								title="My Organization"
								placement="bottomRight"
								delay={1}
								trigger={["hover"]}
								align={{ offset: [16, 0] }}
							/>
							<span className="unread">{teamUMI}</span>
						</span>
						{teamMenuOpen && (
							<TeamMenu closeMenu={() => setTeamMenuOpen(undefined)} menuTarget={teamMenuOpen} />
						)}
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
									Search code comments, feedback
									<br />
									requests, and codestream content.
									<Link
										className="learn-more"
										href="https://docs.newrelic.com/docs/codestream/how-use-codestream/ui-overview/#ui-activity"
									>
										learn more
									</Link>
								</TipTitle>
							}
							placement="bottomRight"
							onPopupAlign={placeArrowTopRight}
						/>
					</label>
				</nav>
			);
		}
	}, [
		activePanel,
		totalUnread,
		totalMentions,
		derivedState.composeCodemarkActive,
		currentReviewId,
		currentCodeErrorId,
		currentPullRequestId,
		currentCodemarkId,
		plusMenuOpen,
		teamMenuOpen,
		ellipsisMenuOpen,
	]);
}
