import {
	LocalFilesCloseDiffRequestType,
	OpenEditorViewNotificationType,
	ReviewCloseDiffRequestType,
} from "@codestream/protocols/webview";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import cx from "classnames";
import React from "react";
import { WebviewPanels } from "@codestream/protocols/api";
import { HeadshotName } from "../src/components/HeadshotName";
import { CodeStreamState } from "../store";
import {
	clearCurrentPullRequest,
	setCreatePullRequest,
	setCurrentCodemark,
	setCurrentReview,
} from "../store/context/actions";
import { HostApi } from "../webview-api";
import { openPanel } from "./actions";
import { EllipsisMenu } from "./EllipsisMenu";
import Icon from "./Icon";
import { Link } from "./Link";
import { PlusMenu } from "./PlusMenu";
import Tooltip, { placeArrowTopRight, TipTitle } from "./Tooltip";
import { parseId } from "../utilities/newRelic";

const sum = (total, num) => total + Math.round(num);

export function GlobalNav() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { users, umis, preferences } = state;
		const user = users[state.session.userId!];
		const eligibleJoinCompanies = user?.eligibleJoinCompanies;
		let inviteCount: number = 0;
		if (eligibleJoinCompanies) {
			eligibleJoinCompanies.forEach(company => {
				if (company.byInvite && !company.accessToken) {
					inviteCount++;
				}
			});
		}
		const currentRepoId = user?.preferences?.currentO11yRepoId;

		return {
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
			currentEntityGuid: currentRepoId
				? (user?.preferences?.activeO11y?.[currentRepoId] as string)
				: undefined,
			entityAccounts: state.context.entityAccounts || [],
			eligibleJoinCompanies,
			inviteCount,
			isVsCode: state.ide.name === "VSC",
			ideName: state.ide.name,
			showNrqlBuilder: state.ide.name === "VSC" || state.ide.name === "JETBRAINS",
			showLogSearch: state.ide.name === "VSC" || state.ide.name === "JETBRAINS",
		};
	});

	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const [plusMenuOpen, setPlusMenuOpen] = React.useState();
	const [teamMenuOpen, setTeamMenuOpen] = React.useState();

	const {
		activePanel,
		eligibleJoinCompanies,
		inviteCount,
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

	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};

	const togglePlusMenu = event => {
		setPlusMenuOpen(plusMenuOpen ? undefined : event.target.closest("label"));
	};

	const launchNrqlEditor = () => {
		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "nrql",
			title: "NRQL",
			entryPoint: "global_nav",
			accountId: parseId(derivedState.currentEntityGuid || "")?.accountId,
			entityGuid: derivedState.currentEntityGuid!,
			entityAccounts: derivedState.entityAccounts,
			ide: {
				name: derivedState.ideName,
			},
		});
	};

	const launchLogSearch = () => {
		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "logs",
			title: "Logs",
			entryPoint: "global_nav",
			entityAccounts: derivedState.entityAccounts,
			entityGuid: derivedState.currentEntityGuid,
			ide: {
				name: derivedState.ideName,
			},
		});
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

	// Plural handling
	const tooltipText = inviteCount < 2 ? "Invitation" : "Invitations";

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
						<HeadshotName
							id={derivedState.currentUserId}
							size={16}
							hasInvites={inviteCount > 0}
							className="no-padding"
						/>
						<Icon name="chevron-down" className="smaller" style={{ verticalAlign: "-2px" }} />

						{inviteCount > 0 && (
							<Tooltip
								placement="topLeft"
								title={`${inviteCount} ${tooltipText}`}
								align={{ offset: [-10, 0] }}
								delay={1}
							>
								<ul
									style={{ listStyle: "none", margin: "0", padding: "0", display: "inline-block" }}
								>
									<li
										style={{
											display: "inline-block",
											backgroundColor: "var(--text-color-info-muted)",
											margin: "0",
											borderRadius: "50%",
											verticalAlign: "-5px",
										}}
									>
										<a
											style={{
												color: "var(--text-color-highlight)",
												display: "table-cell",
												verticalAlign: "middle",
												textAlign: "center",
												textDecoration: "none",
												height: "20px",
												width: "20px",
												paddingTop: "1px",
											}}
											href="#"
										>
											<Icon name="mail" />
										</a>
									</li>
								</ul>
							</Tooltip>
						)}

						{ellipsisMenuOpen && (
							<EllipsisMenu
								closeMenu={() => setEllipsisMenuOpen(undefined)}
								menuTarget={ellipsisMenuOpen}
							/>
						)}
					</label>

					{derivedState.showNrqlBuilder && (
						<label onClick={launchNrqlEditor} id="global-nav-query-label">
							<span>
								<Icon
									name="terminal"
									title="Query your data"
									placement="bottom"
									delay={1}
									trigger={["hover"]}
								/>
							</span>
						</label>
					)}

					{derivedState.showLogSearch && (
						<label onClick={launchLogSearch} id="global-nav-logs-label">
							<span>
								<Icon
									name="logs"
									title="View Logs"
									placement="bottom"
									delay={1}
									trigger={["hover"]}
								/>
							</span>
						</label>
					)}

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
									and replies.
									<Link
										className="learn-more"
										href="https://docs.newrelic.com/docs/codestream/code-discussion/activity-feed-search"
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
									Search comments and issues.
									<Link
										className="learn-more"
										href="https://docs.newrelic.com/docs/codestream/code-discussion/activity-feed-search/#filtersearch"
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
		inviteCount,
	]);
}
