import {
	GetLatestCommittersRequestType,
	KickUserRequestType,
	RepoScmStatus,
	UpdateTeamAdminRequestType,
	UpdateTeamSettingsRequestType
} from "@codestream/protocols/agent";
import { CSTeam, CSUser } from "@codestream/protocols/api";
import copy from "copy-to-clipboard";
import { sortBy as _sortBy } from "lodash-es";
import React from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";
import styled from "styled-components";
import { CSText } from "../src/components/CSText";
import { Dialog } from "../src/components/Dialog";
import { UserStatus } from "../src/components/UserStatus";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { closeModal, openModal, openPanel } from "../store/context/actions";
import { switchToTeam } from "../store/session/actions";
import { getActiveMemberIds } from "../store/users/reducer";
import { mapFilter } from "../utils";
import { HostApi } from "../webview-api";
import { invite, setUserStatus } from "./actions";
import Button from "./Button";
import { confirmPopup } from "./Confirm";
import { DropdownButton } from "./DropdownButton";
import Icon from "./Icon";
import { ChangesetFile } from "./Review/ChangesetFile";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";

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
		padding: 3px 20px 2px 20px;
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

export const MapRow = styled.div`
	display: flex;
	margin: 0;
	> div {
		width: calc(50% - 10px);
		flex-grow: 1;
		padding: 3px 0px;
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

const HR = styled.div`
	margin-top: 20px;
	border-top: 1px solid var(--base-border-color);
`;

const H3 = styled.h3`
	margin-left: 20px;
`;

interface Props extends ConnectedProps {}

interface ConnectedProps {
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
	reviewApproval: "user" | "anyone" | "all";
	setUserStatus: Function;
	openPanel: Function;
	openModal: Function;
	closeModal: Function;
	switchToTeam: Function;
	isCurrentUserAdmin: boolean;
	adminIds: string[];
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

class Invite extends React.Component<Props, State> {
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
			if (email.match(/noreply/)) return;
			// If whitespace in domain, invalid email
			if (email.match(/.*(@.* .+)/)) return;
			// If contains @ and ends in .local is invalid email
			if (email.match(/.*(@.*\.local)$/)) return;
			// Will check for spaces not surrounded by quotes. Will still
			// allow some emails through that shouldn't be through, but
			// won't block any that shouldn't be
			if (email.match(/(?<!"") (?!"")(?=((?:[^"]*"){2})*[^"]*$)/)) return;
			// If no period in domain, invalid email
			if (!email.match(/.*@.*\..*/)) return;
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
		const { invitingEmails } = this.state;

		const suggested = this.state.suggested
			.filter(u => !invitingEmails[u.email])
			.filter(_ => !_.email.match(/noreply/));

		return (
			<Dialog wide title="Invite" onClose={() => this.props.closeModal()}>
				<form className="standard-form" onSubmit={this.onSubmit} style={{ padding: "0" }}>
					{this.renderFieldset()}
				</form>
				<div style={{ margin: "0 -20px" }}>
					{this.props.invited.length > 0 && (
						<>
							<HR />
							<H3>Outstanding Invitations</H3>

							{!this.props.emailSupported && (
								<div className="color-warning" style={{ padding: "0 20px 10px 20px" }}>
									NOTE: Outgoing email is currently not configured. To invite a teammate, click
									"email" or copy the invite code.
								</div>
							)}
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
						</>
					)}
					{suggested.length > 0 && (
						<>
							<HR />
							<H3>Suggested Teammates</H3>
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
						</>
					)}
				</div>
			</Dialog>
		);
	}
}

const EMPTY_HASH = {};
const EMPTY_HASH_2 = {};

const mapStateToProps = state => {
	const { users, context, teams, companies, repos, session, configs, preferences } = state;
	const team = teams[context.currentTeamId];
	const company = companies[team.companyId];

	const memberIds = getActiveMemberIds(team);
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

	const reviewApproval = team.settings ? team.settings.reviewApproval : "user";
	const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;

	const dontSuggestInvitees = team.settings ? team.settings.dontSuggestInvitees || {} : {};
	const multipleReviewersApprove = isFeatureEnabled(state, "multipleReviewersApprove");
	const emailSupported = isFeatureEnabled(state, "emailSupport");
	const autoJoinSupported = isFeatureEnabled(state, "autoJoin");

	return {
		teamId: team.id,
		teamName: team.name,
		reviewApproval,
		blameMap: blameMap || EMPTY_HASH,
		adminIds,
		isCurrentUserAdmin,
		dontSuggestInvitees,
		repos,
		company: company,
		currentUser: currentUser,
		currentUserId: currentUser.id,
		currentUserInvisible: invisible,
		currentUserEmail: currentUser.email,
		members: [currentUser, ..._sortBy(teammates, m => (m.fullName || "").toLowerCase())],
		invited: _sortBy(invited, "email"),
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

const ConnectedInvite = connect(mapStateToProps, {
	invite,
	setUserStatus,
	openPanel,
	openModal,
	closeModal,
	switchToTeam
})(Invite);

export { ConnectedInvite as Invite };
