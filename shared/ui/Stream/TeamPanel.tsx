import React from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";
import Icon from "./Icon";
import Button from "./Button";
import Headshot from "./Headshot";
import { invite, setUserStatus } from "./actions";
import { mapFilter, keyFilter } from "../utils";
import { difference as _difference, sortBy as _sortBy } from "lodash-es";
import { HostApi } from "../webview-api";
import { WebviewPanels, WebviewModals, OpenUrlRequestType } from "@codestream/protocols/webview";
import {
	RepoScmStatus,
	KickUserRequestType,
	UpdateTeamSettingsRequestType,
	UpdateTeamAdminRequestType,
	GetLatestCommittersRequestType
} from "@codestream/protocols/agent";
import { CSTeam, CSUser } from "@codestream/protocols/api";
import { ChangesetFile } from "./Review/ChangesetFile";
import Tooltip, { TipTitle } from "./Tooltip";
import { CSText } from "../src/components/CSText";
import cx from "classnames";
import Timestamp from "./Timestamp";
import { DropdownButton } from "./Review/DropdownButton";
import { confirmPopup } from "./Confirm";
import styled from "styled-components";
import { getCodeCollisions } from "../store/users/reducer";
import { openPanel, openModal } from "../store/context/actions";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { ProfileLink } from "../src/components/ProfileLink";
import copy from "copy-to-clipboard";
import { UserStatus } from "../src/components/UserStatus";
import { SelectPeople } from "../src/components/SelectPeople";
import { HeadshotName } from "../src/components/HeadshotName";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { PaneHeader, Pane, PaneBody, PaneNode, PaneNodeName } from "../src/components/Pane";
import { Modal } from "./Modal";
import { Dialog } from "../src/components/Dialog";
import { PaneState } from "../src/components/Pane";
import { switchToTeam } from "../store/session/actions";
import { Link } from "./Link";

export const EMAIL_REGEX = new RegExp(
	"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
);

export const UL = styled.ul`
	margin: 0;
	padding: 0;
	li:hover,
	li.active {
		opacity: 1;
		color: var(--text-color-highlight);
		background: var(--app-background-color-hover);
	}
	li {
		position: relative;
		font-weight: normal;
		padding: 3px 10px 2px 40px;
		margin: 0;
		// cursor: pointer;
		list-style: none;
		overflow: hidden;
		text-overflow: ellipsis;
		.icon:not(.chevron-down) {
			// top: 2px !important;
			margin-right: 5px;
		}
	}
	li:hover {
		span.align-right {
			display: inline-block;
		}
	}
	li.muted {
		opacity: 0.5;
	}
	.status {
		overflow: hidden;
		whitespace: nowrap;
		padding-left: 68px;
	}
	@media only screen and (max-width: 430px) {
		.wide-text {
			display: none;
		}
		.status {
			padding-left: 58px;
		}
	}
`;

const MapRow = styled.div`
	display: flex;
	margin: 0px 10px 0 30px;
	> div {
		width: calc(50% - 10px);
		flex-grow: 1;
		padding: 3px 10px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

const StyledUserStatus = styled(UserStatus)`
	padding: 3px 0 3px 68px;
	&:hover {
		background: var(--app-background-color-hover);
	}
	@media only screen and (max-width: 430px) {
		padding: 3px 0 3px 58px;
	}
`;

export const Section = styled.div`
	padding-bottom: 15px;
	border-bottom: 1px solid var(--base-border-color);
`;

interface Props extends ConnectedProps {
	paneState: PaneState;
}

interface ConnectedProps {
	webviewFocused: boolean;
	teamId: string;
	invite: Function;
	invited: any[];
	teamName: string;
	// companyPlan: any;
	// companyMemberCount: number;
	members: CSUser[];
	repos: any;
	company: any;
	currentUser: CSUser;
	currentUserInvisible: false;
	currentUserEmail: string;
	currentUserId: string;
	xraySetting: string;
	xrayEnabled: boolean;
	reviewApproval: "user" | "anyone" | "all";
	setUserStatus: Function;
	openPanel: Function;
	openModal: Function;
	switchToTeam: Function;
	isCurrentUserAdmin: boolean;
	adminIds: string[];
	collisions: any;
	dontSuggestInvitees: any;
	multipleReviewersApprove: boolean;
	emailSupported: boolean;
	autoJoinSupported: boolean;
	blameMap: { [email: string]: string };
	serverUrl: string;
	isOnPrem: boolean;
	hiddenPaneNodes: { [nodeId: string]: boolean };
	userTeams: CSTeam[];
}

interface State {
	loading: boolean;
	isInviting: boolean;
	invitingEmails: any;
	newMemberEmail: string;
	newMemberEmailInvalid: boolean;
	newMemberName: string;
	newMemberInvalid: boolean;
	newMemberInputTouched: boolean;
	inputTouched: boolean;
	modifiedRepos: RepoScmStatus[];
	loadingStatus: boolean;
	suggested: any[];
	blameMapEmail: string;
	addingBlameMap: boolean;
	showInvitePopup: boolean;
}

class TeamPanel extends React.Component<Props, State> {
	initialState = {
		loading: false,
		isInviting: false,
		invitingEmails: {},
		newMemberEmail: "",
		newMemberName: "",
		newMemberInvalid: false,
		newMemberInputTouched: false,
		inputTouched: false,
		newMemberEmailInvalid: false,
		modifiedRepos: [],
		loadingStatus: false,
		suggested: [],
		blameMapEmail: "",
		addingBlameMap: false,
		showInvitePopup: false
	};

	postInviteResetState = {
		loadingStatus: false,
		loading: false,
		isInviting: false,
		newMemberEmail: "",
		newMemberName: "",
		newMemberInvalid: false,
		newMemberInputTouched: false,
		inputTouched: false,
		newMemberEmailInvalid: false,
		showInvitePopup: false
	};

	private _pollingTimer?: any;
	private _mounted: boolean = false;
	private disposables: { dispose(): void }[] = [];

	constructor(props: Props) {
		super(props);
		this.state = this.initialState;
	}

	componentDidMount() {
		this._mounted = true;
		this.getSuggestedInvitees();
	}

	getSuggestedInvitees = async () => {
		// for now, suggested invitees are only available to admins
		if (!this.props.isCurrentUserAdmin) return;

		const result = await HostApi.instance.send(GetLatestCommittersRequestType, {});
		const committers = result ? result.scm : undefined;
		if (!committers) return;

		const { members, invited, dontSuggestInvitees } = this.props;
		const suggested: any[] = [];
		Object.keys(committers).forEach(email => {
			if (members.find(user => user.email === email)) return;
			if (invited.find(user => user.email === email)) return;
			if (dontSuggestInvitees[email.replace(/\./g, "*")]) return;
			suggested.push({ email, fullName: committers[email] || email });
		});
		this.setState({ suggested });
	};

	onEmailChange = event => {
		this.setState({ newMemberEmail: event.target.value });
		if (this.state.newMemberEmailInvalid) {
			this.setState(state => ({
				newMemberEmailInvalid:
					state.newMemberEmail !== "" && EMAIL_REGEX.test(state.newMemberEmail) === false
			}));
		}
	};

	onEmailBlur = event => {
		this.setState(state => ({
			inputTouched: true,
			newMemberEmailInvalid:
				state.newMemberEmail !== "" && EMAIL_REGEX.test(state.newMemberEmail) === false
		}));
	};

	onNameChange = event => this.setState({ newMemberName: event.target.value });

	onSubmit = event => {
		event.preventDefault();
		const { newMemberEmail, newMemberName, newMemberEmailInvalid } = this.state;
		if (newMemberEmailInvalid || newMemberEmail === "") return;

		this.setState({ loading: true });
		this.props
			.invite({ email: newMemberEmail, fullName: newMemberName, teamId: this.props.teamId })
			.then(() => {
				this.setState(this.postInviteResetState);
				const div = document.getElementById("outstanding-invitations");
				if (div) {
					div.classList.add("highlight-pulse");
					setTimeout(() => {
						div.classList.remove("highlight-pulse");
					}, 1000);
				}
			});
		HostApi.instance.track("Teammate Invited", {
			"Invitee Email Address": newMemberEmail,
			"Invitee Name": newMemberName,
			"Invitation Method": "Manual"
		});
	};

	onClickReinvite = (user, type) => {
		const { email, fullName } = user;
		this.setState({ invitingEmails: { ...this.state.invitingEmails, [email]: 1 } });
		this.props
			.invite({ email: user.email, fullName: user.fullName, teamId: this.props.teamId })
			.then(() => {
				// TODO: show notification
				// atom.notifications.addInfo(
				// 	this.props.intl.formatMessage({
				// 		id: "invitation.emailSent",
				// 		defaultMessage: `Invitation sent to ${user.email}!`
				// 	})
				// );
				this.setState({ invitingEmails: { ...this.state.invitingEmails, [email]: 2 } });
				setTimeout(() => {
					// reset from "email sent" back to "reinvite" after three seconds
					this.setState({ invitingEmails: { ...this.state.invitingEmails, [email]: 0 } });
				}, 3000);
			});
		HostApi.instance.track("Teammate Invited", {
			"Invitee Email Address": user.email,
			"Invitee Name": user.fullName,
			"Invitation Method": type === "reinvite" ? "Reinvite" : "Suggested"
		});
	};

	focusEmailInput = () => {
		const input = document.getElementById("invite-email-input");
		if (input) input.focus();
	};

	renderEmailHelp = () => {
		const { newMemberEmailInvalid, inputTouched } = this.state;

		if (inputTouched && newMemberEmailInvalid) {
			return (
				<small className="error-message">
					<FormattedMessage id="login.email.invalid" />
				</small>
			);
		} else return null;
	};

	renderThirdParyInvite = provider => {
		return (
			<div style={{ padding: "30px", textAlign: "center" }}>
				Invite your teammates to give CodeStream a try by sharing this URL with them:
				<br />
				<br />
				<b>https://www.codestream.com/{provider}-invite</b>
				<br />
				<br />
			</div>
		);
	};

	// no longer used
	// renderInviteDisabled = () => {
	// 	const upgradeLink = `${this.props.serverUrl}/web/subscription/upgrade/${this.props.companyId}`;
	// 	return (
	// 		<div style={{ padding: "30px", textAlign: "center" }}>
	// 			{this.props.isOnPrem && (
	// 				<>
	// 					Contact <a href="mailto:sales@codestream.com">sales@codestream.com</a> to upgrade your
	// 					plan if you'd like to invite more teammates.
	// 				</>
	// 			)}
	// 			{!this.props.isOnPrem && (
	// 				<>
	// 					<a href={upgradeLink}>Upgrade your plan</a> if you'd like to invite more teammates.
	// 				</>
	// 			)}
	// 			<br />
	// 			<br />
	// 		</div>
	// 	);
	// };

	// Post URL to{" "}
	// <select style={{ width: "auto" }}>
	// 	<option>#general</option>
	// </select>
	// <Button>Go</Button>

	renderFieldset = () => {
		const { newMemberEmail, newMemberName, isInviting } = this.state;

		// if (
		// 	this.props.companyPlan &&
		// 	this.props.companyPlan === "FREEPLAN" &&
		// 	(this.props.companyMemberCount || 0) >= 5
		// ) {
		// 	return this.renderInviteDisabled();
		// }

		// if there aren't very many people on the team, we can safely
		// auto-focus the invitation input. but when there are a lot,
		// auto-focus would cause scrolling which is undesireable.
		// const autoFocus = this.props.companyMemberCount < 5;

		const inviteButtonId = this.props.emailSupported
			? "teamMemberSelection.invite"
			: "teamMemberSelection.getInviteCode";
		const inviteButtonWidth = this.props.emailSupported ? "60px" : "120px";

		return (
			<fieldset className="form-body" style={{ padding: "0", maxWidth: "none" }}>
				<div id="controls">
					<div style={{ display: "flex", alignItems: "flex-end" }}>
						<div className="control-group" style={{ flexGrow: 3 }}>
							<input
								className="input-text outline"
								id="invite-email-input"
								type="text"
								value={newMemberEmail}
								onChange={this.onEmailChange}
								onBlur={this.onEmailBlur}
								placeholder="Invite a Teammate via Email..."
							/>
							{this.renderEmailHelp()}
						</div>
						<Button
							style={{ width: inviteButtonWidth, margin: "0 0 6px 10px" }}
							id="add-button"
							className="control-button"
							type="submit"
							loading={this.state.loading}
						>
							<FormattedMessage id={inviteButtonId} defaultMessage="Invite" />
						</Button>
					</div>
				</div>
			</fieldset>
		);
	};

	renderEmailUser(user, linkText = "reinvite") {
		const { invitingEmails } = this.state;
		switch (invitingEmails[user.email]) {
			case 1:
				return (
					<span style={{ verticalAlign: "2px" }}>
						<Icon className="spin smaller" name="sync" />
					</span>
				);
			case 2:
				return <span>email sent</span>;
			default:
				return (
					<a
						onClick={event => {
							event.preventDefault();
							this.onClickReinvite(user, linkText);
						}}
					>
						{linkText}
					</a>
				);
		}
	}

	revoke(user: CSUser) {
		const { teamId } = this.props;
		HostApi.instance.send(UpdateTeamAdminRequestType, { teamId, remove: user.id });
	}

	promote(user: CSUser) {
		const { teamId } = this.props;
		HostApi.instance.send(UpdateTeamAdminRequestType, { teamId, add: user.id });
	}

	confirmKick(user: CSUser) {
		confirmPopup({
			title: "Are you sure?",
			message: "",
			centered: true,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Remove User",
					className: "delete",
					wait: true,
					action: () => this.kick(user)
				}
			]
		});
	}

	kick = (user: CSUser) => {
		const { teamId } = this.props;
		HostApi.instance.send(KickUserRequestType, { teamId, userId: user.id });
	};

	renderAdminUser(user: CSUser) {
		const { isCurrentUserAdmin, adminIds } = this.props;

		const revokeAdmin = { label: "Revoke Admin", action: () => this.revoke(user) };
		const promoteAdmin = { label: "Make Admin", action: () => this.promote(user) };
		const kickUser = { label: "Remove from Team", action: () => this.confirmKick(user) };

		const isUserAdmin = adminIds.includes(user.id);
		if (isCurrentUserAdmin && user.id !== this.props.currentUserId) {
			if (isUserAdmin) {
				return (
					<span className="float-right">
						<DropdownButton variant="text" items={[revokeAdmin]}>
							Admin
						</DropdownButton>
					</span>
				);
			} else {
				return (
					<span className="float-right">
						<DropdownButton variant="text" items={[promoteAdmin, kickUser]}>
							Member
						</DropdownButton>
					</span>
				);
			}
		} else {
			if (isUserAdmin) return <span className="float-right">Admin</span>;
		}
		return null;
	}

	renderModifiedRepos(user) {
		const {
			repos,
			teamId,
			company,
			serverUrl,
			currentUserEmail,
			collisions,
			xrayEnabled
		} = this.props;
		const { modifiedRepos, modifiedReposModifiedAt } = user;

		if (!xrayEnabled) return null;
		if (!modifiedRepos || !modifiedRepos[teamId] || !modifiedRepos[teamId].length) return null;

		return modifiedRepos[teamId].map(repo => {
			const { repoId = "", authors, modifiedFiles } = repo;
			if (modifiedFiles.length === 0) return null;
			const repoName = repos[repoId] ? repos[repoId].name : "";
			const added = modifiedFiles.reduce((total, f) => total + f.linesAdded, 0);
			const removed = modifiedFiles.reduce((total, f) => total + f.linesRemoved, 0);
			const stomp =
				user.email === currentUserEmail
					? null
					: (authors || []).find(a => a.email === currentUserEmail && a.stomped > 0);
			const title = (
				<div style={{ maxWidth: "60vw" }}>
					<>
						<div className="related-label">Local Changes</div>
						{modifiedFiles.map(f => {
							const className = collisions.userRepoFiles[user.id + ":" + repo.repoId + ":" + f.file]
								? "file-has-conflict"
								: "";
							return <ChangesetFile className={className} noHover={true} key={f.file} {...f} />;
						})}
						{stomp && (
							<div style={{ paddingTop: "5px" }}>
								<span className="stomped" style={{ paddingLeft: 0 }}>
									@{stomp.stomped}
								</span>{" "}
								= includes {stomp.stomped} change
								{stomp.stomped > 1 ? "s" : ""} to code you wrote
							</div>
						)}
						{collisions.userRepos[user.id + ":" + repo.repoId] && (
							<div style={{ paddingTop: "5px" }}>
								<Icon name="alert" className="conflict" /> = possible merge conflict
							</div>
						)}
						{modifiedReposModifiedAt && modifiedReposModifiedAt[teamId] && (
							<div style={{ paddingTop: "5px", color: "var(--text-color-subtle)" }}>
								Updated
								<Timestamp relative time={modifiedReposModifiedAt[teamId]} />
							</div>
						)}
					</>
				</div>
			);
			return (
				<li key={repoId} className="status row-with-icon-actions">
					<Tooltip title={title} placement="bottomRight" delay={1}>
						<div style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
							<Icon name="repo" />
							{repoName} &nbsp; <Icon name="git-branch" />
							{repo.branch}
							{added > 0 && <span className="added">+{added}</span>}
							{removed > 0 && <span className="deleted">-{removed}</span>}
							{stomp && <span className="stomped">@{stomp.stomped}</span>}
							{collisions.userRepos[user.id + ":" + repo.repoId] && (
								<Icon name="alert" className="conflict" />
							)}
						</div>
					</Tooltip>
				</li>
			);
		});
	}

	changeXray = async value => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: this.props.teamId,
			settings: { xray: value }
		});
	};

	removeSuggestion = async user => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: this.props.teamId,
			// we need to replace . with * to allow for the creation of deeply-nested
			// team settings, since that's how they're stored in mongo
			settings: { dontSuggestInvitees: { [user.email.replace(/\./g, "*")]: true } }
		});
		this.getSuggestedInvitees();
	};

	onBlameMapEmailChange = event => {
		this.setState({ blameMapEmail: event.target.value });
	};

	onBlameMapEmailBlur = () => {
		if (!this.state.blameMapEmail) {
			this.setState({ addingBlameMap: false });
		}
	};

	onBlameMapUserChange = (email: string, person?: CSUser) => {
		if (person) this.addBlameMap(email, person.id);
		else this.addBlameMap(email, "");
	};

	addBlameMap = async (author: string, assigneeId: string) => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: this.props.teamId,
			// we need to replace . with * to allow for the creation of deeply-nested
			// team settings, since that's how they're stored in mongo
			settings: { blameMap: { [author.replace(/\./g, "*")]: assigneeId } }
		});
		this.setState({ blameMapEmail: "", addingBlameMap: false });
	};

	deleteTeam = () => {
		confirmPopup({
			title: "Delete Team",
			message:
				"Team deletion is handled by customer service. Please send an email to support@codestream.com.",
			centered: false,
			buttons: [{ label: "OK", className: "control-button" }]
		});
	};

	render() {
		const { currentUserId, teamId, userTeams, blameMap, collisions, xraySetting } = this.props;
		const { invitingEmails, loadingStatus, addingBlameMap } = this.state;

		const suggested = this.state.suggested.filter(u => !invitingEmails[u.email]);
		const mappedBlame = keyFilter(blameMap);

		const teamMenuItems = userTeams.map(team => {
			const isCurrentTeam = team.id === teamId;
			return {
				key: team.id,
				label: team.name,
				// icon: isCurrentTeam ? <Icon name="check" /> : undefined,
				checked: isCurrentTeam,
				noHover: isCurrentTeam,
				action: () => {
					if (!isCurrentTeam) this.props.switchToTeam(team.id);
				}
			};
		}) as any;

		teamMenuItems.push(
			{ label: "-" },
			{
				key: "create-team",
				icon: <Icon name="plus" />,
				label: "Create New Team",
				action: () => {
					this.props.openModal(WebviewModals.CreateTeam);
				}
			}
		);

		const settingsMenuItems = [
			{
				label: "Change Team Name",
				key: "change-team-name",
				action: () => this.props.openModal(WebviewModals.ChangeTeamName)
			},
			{ label: "-" },
			{
				label: "Onboarding Settings...",
				key: "onboarding-settings",
				action: () => this.props.openModal(WebviewModals.TeamSetup),
				disabled: !this.props.autoJoinSupported
			},
			{
				label: "Feedback Request Settings...",
				key: "review-settings",
				action: () => this.props.openModal(WebviewModals.ReviewSettings)
			},
			{
				label: "Live View Settings",
				key: "live-view-settings",
				submenu: [
					{
						label: "Always On",
						checked: xraySetting === "on",
						action: () => this.changeXray("on")
					},
					{
						label: "Always Off",
						checked: xraySetting === "off",
						action: () => this.changeXray("off")
					},
					{
						label: "User Selectable",
						checked: !xraySetting || xraySetting === "user",
						action: () => this.changeXray("user")
					},
					{ label: "-", action: () => {} },
					{
						label: "What is Live View?",
						action: () => {
							HostApi.instance.send(OpenUrlRequestType, {
								url: "https://docs.codestream.com/userguide/features/myteam-section/"
							});
						}
					}
				]
			},
			{ label: "-" },
			{ label: "Delete Team", action: () => this.deleteTeam() }
		];

		return (
			<>
				{this.state.showInvitePopup && (
					<Modal translucent>
						<Dialog
							narrow
							title="Invite a Teammate"
							onClose={() => this.setState({ showInvitePopup: false })}
						>
							<p>
								Enter the email address of your teammate below to send an invitation to collaborate
								on CodeStream.
							</p>
							<form className="standard-form" onSubmit={this.onSubmit} style={{ padding: "0" }}>
								{this.renderFieldset()}
							</form>
						</Dialog>
					</Modal>
				)}
				<PaneHeader
					title="My Team"
					subtitle={
						<>
							<InlineMenu
								key="team-display-options"
								className="subtle no-padding"
								noFocusOnSelect
								items={teamMenuItems}
							>
								{this.props.teamName}
							</InlineMenu>
						</>
					}
					id={WebviewPanels.Team}
					warning={
						collisions.nav.length > 0 ? (
							<Icon
								name="alert"
								className="nav-conflict toggle-target"
								title={"Possible Merge Conflict w/" + collisions.nav.join(", ")}
								placement="top"
							/>
						) : null
					}
				>
					<Icon
						onClick={() => this.setState({ showInvitePopup: true })}
						name="add-user"
						title="Invite"
						placement="bottom"
						delay={1}
					/>
					{this.props.isCurrentUserAdmin && (
						<InlineMenu
							key="team-display-options"
							className="subtle no-padding"
							noFocusOnSelect
							noChevronDown
							items={settingsMenuItems}
						>
							<Icon name="gear" title="Team Settings" placement="bottom" delay={1} />
						</InlineMenu>
					)}
					{this.props.isCurrentUserAdmin && (
						<Icon
							onClick={() => this.props.openPanel(WebviewPanels.Export)}
							name="export"
							title="Export Data"
							placement="bottom"
							delay={1}
						/>
					)}
				</PaneHeader>
				{this.props.paneState !== PaneState.Collapsed && (
					<PaneBody className="team-pane-body">
						<PaneNode>
							<PaneNodeName id="team/teammates" title="Current Members" />
							{!this.props.hiddenPaneNodes["team/teammates"] && (
								<UL>
									{this.props.members.map(user => (
										<React.Fragment key={user.email}>
											<li key={user.email}>
												{this.renderAdminUser(user)}
												<ProfileLink id={user.id}>
													<Headshot person={user} />
													<b className="wide-text">{user.fullName} </b>
													<CSText as="span" muted>
														@{user.username}{" "}
													</CSText>
												</ProfileLink>
											</li>
											<StyledUserStatus user={user} />
											{user.id !== currentUserId && this.renderModifiedRepos(user)}
										</React.Fragment>
									))}
									<form
										className="standard-form"
										onSubmit={this.onSubmit}
										style={{ padding: "0 20px 0 40px" }}
									>
										{this.renderFieldset()}
									</form>
								</UL>
							)}
						</PaneNode>
						{this.props.invited.length > 0 && (
							<PaneNode id="outstanding-invitations">
								<PaneNodeName
									id="team/invitations"
									title="Outstanding Invitations"
									count={this.props.invited.length}
								/>
								{!this.props.emailSupported && (
									<div className="color-warning" style={{ padding: "0 20px 10px 20px" }}>
										NOTE: Outgoing email is currently not configured. To invite a teammate, click
										"email" or copy the invite code.
									</div>
								)}
								{!this.props.hiddenPaneNodes["team/invitations"] && (
									<UL>
										{this.props.invited.map(user => {
											const body = encodeURIComponent(
												`1. Download and install CodeStream: https://www.codestream.com/roadmap\n\n2. Paste in your invitation code: ${user.inviteCode}\n\n`
											);
											const subject = "Invitation to CodeStream";
											const title = user.inviteCode ? (
												this.props.emailSupported ? (
													<div>
														Sometimes emails from CodeStream are blocked.
														<div style={{ height: "10px" }}></div>
														<a href={`mailto:${user.email}?Subject=${subject}&body=${body}`}>
															Click Here
														</a>{" "}
														to email an invitation from you.
														<div style={{ height: "10px" }}></div>
														Or share the invite code for {user.email}:
														<br />
														{user.inviteCode}
													</div>
												) : (
													undefined
												)
											) : (
												undefined
											);
											return (
												<li key={user.email}>
													<div className="committer-email">
														{user.email}
														<div className="float-right">
															{this.props.isCurrentUserAdmin && (
																<>
																	<a onClick={e => this.kick(user)}>remove</a>
																	<span style={{ padding: "0 5px" }}>&middot;</span>
																</>
															)}
															{!this.props.emailSupported && (
																<>
																	<a onClick={e => copy(user.inviteCode)}>copy code</a>
																	<span style={{ padding: "0 5px" }}>&middot;</span>
																</>
															)}
															{this.props.emailSupported ? (
																<Tooltip
																	title={title}
																	placement="topRight"
																	align={{ offset: [35, -5] }}
																>
																	{this.renderEmailUser(user)}
																</Tooltip>
															) : (
																<a href={`mailto:${user.email}?Subject=${subject}&body=${body}`}>
																	email
																</a>
															)}
														</div>
													</div>
													{!this.props.emailSupported && (
														<div>
															<CSText as="span" muted>
																{user.inviteCode}
															</CSText>
														</div>
													)}
												</li>
											);
										})}
									</UL>
								)}
							</PaneNode>
						)}
						{suggested.length > 0 && (
							<PaneNode>
								<PaneNodeName
									id="team/suggestions"
									title="Suggested Teammates"
									subtitle="from your git history"
								/>
								{!this.props.hiddenPaneNodes["team/suggestions"] && (
									<UL>
										{suggested.map(user => (
											<li key={user.email}>
												<div className="committer-email">
													{user.fullName}{" "}
													<CSText as="span" muted>
														{user.email}
													</CSText>
													<div className="float-right">
														<a onClick={e => this.removeSuggestion(user)}>remove</a>
														<span style={{ padding: "0 5px" }}>&middot;</span>
														{this.renderEmailUser(user, "invite")}
													</div>
												</div>
											</li>
										))}
									</UL>
								)}
							</PaneNode>
						)}
						{(this.props.isCurrentUserAdmin || mappedBlame.length > 0) && (
							<PaneNode>
								<PaneNodeName
									id="team/blame-map"
									title="Blame Map"
									subtitle="reassign code responsibility"
								/>
								{!this.props.hiddenPaneNodes["team/blame-map"] && (
									<>
										<MapRow>
											<div>
												<b>Code Authored By</b>
											</div>
											<div>
												<b>Now Handled By</b>
											</div>
										</MapRow>
										{mappedBlame.map(email => (
											<MapRow key={email}>
												<div>{email.replace(/\*/g, ".")}</div>
												<div>
													{this.props.isCurrentUserAdmin ? (
														<SelectPeople
															title="Handled By"
															multiSelect={false}
															value={[]}
															extraItems={[
																{ label: "-" },
																{
																	icon: <Icon name="trash" />,
																	label: "Delete Mapping",
																	key: "remove",
																	action: () => this.onBlameMapUserChange(email)
																}
															]}
															onChange={person => this.onBlameMapUserChange(email, person)}
														>
															<HeadshotName
																id={blameMap[email]}
																onClick={() => {} /* noop onclick to get cursor pointer */}
															/>
															<Icon name="chevron-down" />
														</SelectPeople>
													) : (
														<HeadshotName id={blameMap[email]} />
													)}
												</div>
											</MapRow>
										))}
										{mappedBlame.length === 0 && !addingBlameMap && (
											<MapRow>
												<div>
													<i style={{ opacity: 0.5 }}>example@acme.com</i>
												</div>
												<div>
													<i style={{ opacity: 0.5 }}>newhire@acme.com</i>
												</div>
											</MapRow>
										)}

										{this.props.isCurrentUserAdmin && !addingBlameMap && (
											<MapRow>
												<div>
													<a onClick={() => this.setState({ addingBlameMap: true })}>Add mapping</a>
												</div>
											</MapRow>
										)}
										{addingBlameMap && (
											<MapRow>
												<div style={{ position: "relative" }}>
													<input
														style={{ width: "100%", paddingRight: "30px !important" }}
														className="input-text"
														id="blame-map-email"
														type="text"
														value={this.state.blameMapEmail}
														onChange={this.onBlameMapEmailChange}
														placeholder="Email..."
														autoFocus={true}
													/>
													{suggested.length > 0 && (
														<div style={{ position: "absolute", right: "15px", top: "7px" }}>
															<InlineMenu
																className="big-chevron"
																items={suggested.map(suggestion => {
																	return {
																		label: suggestion.email,
																		action: () => this.setState({ blameMapEmail: suggestion.email })
																	};
																})}
															></InlineMenu>
														</div>
													)}
												</div>
												<div>
													{EMAIL_REGEX.test(this.state.blameMapEmail) && (
														<SelectPeople
															title="Handled By"
															multiSelect={false}
															value={[]}
															onChange={person =>
																this.onBlameMapUserChange(this.state.blameMapEmail, person)
															}
														>
															Select Person <Icon name="chevron-down" />
														</SelectPeople>
													)}
												</div>
											</MapRow>
										)}
									</>
								)}
							</PaneNode>
						)}
						<div style={{ height: "50px" }} />
						<br />
					</PaneBody>
				)}
			</>
		);
	}
}

const EMPTY_HASH = {};
const EMPTY_HASH_2 = {};

const mapStateToProps = state => {
	const { users, context, teams, companies, repos, session, configs, preferences } = state;
	const team = teams[context.currentTeamId];
	const company = companies[team.companyId];

	const memberIds = _difference(team.memberIds, team.removedMemberIds || []);
	const teammates = mapFilter(memberIds, id => {
		const user = users[id as string];
		if (!user || !user.isRegistered || user.deactivated || user.externalUserId) return;

		if (!user.fullName) {
			let email = user.email;
			if (email) user.fullName = email.replace(/@.*/, "");
		}

		// filter out the current user, as we'll render them first
		if (id === session.userId) return;

		return user;
	});
	const currentUser = users[session.userId];
	const invisible = currentUser.status ? currentUser.status.invisible : false;

	const adminIds = team.adminIds;
	const isCurrentUserAdmin = adminIds.includes(session.userId);

	const invited = mapFilter(memberIds, id => {
		const user = users[id as string];
		if (!user || user.isRegistered || user.deactivated || user.externalUserId) return;
		let email = user.email;
		if (email) user.fullName = email.replace(/@.*/, "");
		return user;
	});

	const xraySetting = team.settings ? team.settings.xray : "";
	const xrayEnabled = xraySetting !== "off";
	const collisions = getCodeCollisions(state);

	const reviewApproval = team.settings ? team.settings.reviewApproval : "user";
	const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;

	const dontSuggestInvitees = team.settings ? team.settings.dontSuggestInvitees || {} : {};
	const multipleReviewersApprove = isFeatureEnabled(state, "multipleReviewersApprove");
	const emailSupported = isFeatureEnabled(state, "emailSupport");
	const autoJoinSupported = isFeatureEnabled(state, "autoJoin");

	return {
		teamId: team.id,
		teamName: team.name,
		xraySetting,
		reviewApproval,
		blameMap: blameMap || EMPTY_HASH,
		adminIds,
		isCurrentUserAdmin,
		dontSuggestInvitees,
		repos,
		collisions,
		company: company,
		currentUser: currentUser,
		currentUserId: currentUser.id,
		currentUserInvisible: invisible,
		currentUserEmail: currentUser.email,
		members: [currentUser, ..._sortBy(teammates, m => (m.fullName || "").toLowerCase())],
		invited: _sortBy(invited, "email"),
		webviewFocused: context.hasFocus,
		xrayEnabled,
		multipleReviewersApprove,
		emailSupported,
		autoJoinSupported,
		serverUrl: configs.serverUrl,
		isOnPrem: configs.isOnPrem,
		hiddenPaneNodes: preferences.hiddenPaneNodes || EMPTY_HASH_2,
		userTeams: _sortBy(
			Object.values(teams).filter((t: any) => !t.deactivated),
			"name"
		) as CSTeam[]
	};
};

const ConnectedTeamPanel = connect(mapStateToProps, {
	invite,
	setUserStatus,
	openPanel,
	openModal,
	switchToTeam
})(TeamPanel);

export { ConnectedTeamPanel as TeamPanel };

const LocalChanges = styled.div`
	text-align: center;
	padding: 1px;
	display: flex;
	justify-content: space-around;
`;
