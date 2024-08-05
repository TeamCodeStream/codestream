import {
	LocalFilesCloseDiffRequestType,
	OpenEditorViewNotificationType,
	ReviewCloseDiffRequestType,
} from "@codestream/protocols/webview";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import cx from "classnames";
import React, { useCallback } from "react";
import { WebviewPanels } from "@codestream/protocols/api";
import { HeadshotName } from "../src/components/HeadshotName";
import { CodeStreamState } from "../store";
import {
	clearCurrentPullRequest,
	setCreatePullRequest,
	setCurrentReview,
} from "../store/context/actions";
import { HostApi } from "../webview-api";
import { openPanel } from "./actions";
import { EllipsisMenu } from "./EllipsisMenu";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { parseId } from "../utilities/newRelic";
import { TourTip } from "../src/components/TourTip";
import { getSidebarLocation } from "../store/editorContext/reducer";
import { isEmpty as _isEmpty } from "lodash-es";
import { StepOneContinue, StepOneEnd } from "./O11yTourTips";
const sum = (total, num) => total + Math.round(num);

export function GlobalNav() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { users } = state;
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

		const hasEntityAccounts = !_isEmpty(state.context.entityAccounts);

		return {
			currentUserId: state.session.userId,
			activePanel: state.context.panelStack[0],
			currentReviewId: state.context.currentReviewId,
			currentCodeErrorGuid: state.context.currentCodeErrorGuid,

			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			currentEntityGuid: state.context.currentEntityGuid,
			eligibleJoinCompanies,
			inviteCount,
			isVsCode: state.ide.name === "VSC",
			ideName: state.ide.name,
			showNrqlBuilder: state.ide.name === "VSC" || state.ide.name === "JETBRAINS",
			showLogSearch: state.ide.name === "VSC" || state.ide.name === "JETBRAINS",
			o11yTour: state.preferences.o11yTour ? state.preferences.o11yTour : "globalNav",
			sidebarLocation: getSidebarLocation(state),
			hasEntityAccounts,
		};
	});

	const [ellipsisMenuOpen, setEllipsisMenuOpen] = React.useState();
	const [plusMenuOpen, setPlusMenuOpen] = React.useState();
	const [teamMenuOpen, setTeamMenuOpen] = React.useState();

	const { activePanel, inviteCount, currentReviewId, currentCodeErrorGuid, currentPullRequestId } =
		derivedState;

	const toggleEllipsisMenu = event => {
		setEllipsisMenuOpen(ellipsisMenuOpen ? undefined : event.target.closest("label"));
	};

	const togglePlusMenu = event => {
		setPlusMenuOpen(plusMenuOpen ? undefined : event.target.closest("label"));
	};

	const launchNrqlEditor = useCallback(() => {
		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "nrql",
			title: "NRQL",
			entryPoint: "global_nav",
			accountId: parseId(derivedState.currentEntityGuid || "")?.accountId,
			entityGuid: derivedState.currentEntityGuid!,
			ide: {
				name: derivedState.ideName,
			},
		});
	}, [derivedState.currentEntityGuid]);

	const launchLogSearch = useCallback(() => {
		HostApi.instance.notify(OpenEditorViewNotificationType, {
			panel: "logs",
			title: "Logs",
			entryPoint: "global_nav",
			entityGuid: derivedState.currentEntityGuid,
			ide: {
				name: derivedState.ideName,
			},
		});
	}, [derivedState.currentEntityGuid]);

	const go = panel => {
		close();
		dispatch(openPanel(panel));
	};

	const close = () => {
		dispatch(setCreatePullRequest());
		dispatch(clearCurrentPullRequest());
		dispatch(setCurrentReview());

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

	const globalNavTourTipTitle =
		derivedState.o11yTour === "globalNav" &&
		derivedState.showNrqlBuilder &&
		derivedState.showLogSearch &&
		derivedState.hasEntityAccounts ? (
			<StepOneContinue />
		) : derivedState.o11yTour === "globalNav" &&
		  derivedState.showNrqlBuilder &&
		  derivedState.showLogSearch &&
		  !derivedState.hasEntityAccounts ? (
			<StepOneEnd />
		) : undefined;

	return React.useMemo(() => {
		if (activePanel === WebviewPanels.Onboard) return null;
		else if (activePanel === WebviewPanels.OnboardNewRelic) return null;
		else {
			return (
				<nav style={{ borderBottom: "none" }} className="inline" id="global-nav">
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

					<TourTip title={globalNavTourTipTitle} placement={"bottomLeft"}>
						<div
							style={{
								backgroundColor: globalNavTourTipTitle
									? "var(--panel-tool-background-color)"
									: "inherit",
								borderRadius: globalNavTourTipTitle ? "2px" : "none",
								padding: globalNavTourTipTitle ? "1px 0px 0px 2px" : 0,
							}}
						>
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
						</div>
					</TourTip>
				</nav>
			);
		}
	}, [
		activePanel,
		derivedState.currentEntityGuid,
		currentReviewId,
		currentCodeErrorGuid,
		currentPullRequestId,
		plusMenuOpen,
		teamMenuOpen,
		ellipsisMenuOpen,
		inviteCount,
		derivedState.o11yTour,
	]);
}
