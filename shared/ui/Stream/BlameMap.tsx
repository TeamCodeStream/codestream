import {
	AddBlameMapRequestType,
	DeleteBlameMapRequestType,
	GetLatestCommittersRequestType,
} from "@codestream/protocols/agent";
import { CSUser } from "@codestream/protocols/api";
import { sortBy as _sortBy } from "lodash-es";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { Dialog } from "../src/components/Dialog";
import { HeadshotName } from "../src/components/HeadshotName";
import { SelectPeople } from "../src/components/SelectPeople";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { getActiveMemberIds } from "../store/users/reducer";
import { useDidMount } from "../utilities/hooks";
import { keyFilter, mapFilter } from "../utils";
import { HostApi } from "../webview-api";
import { closeModal } from "./actions";
import Icon from "./Icon";

const EMAIL_REGEX = new RegExp(
	"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
);
const EMPTY_HASH = {};
const EMPTY_HASH_2 = {};

export const MapRow = styled.div`
	display: flex;
	margin: 0;
	> div {
		width: calc(50% - 10px);
		flex-grow: 1;
		padding: 5px 0px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	border-top: 1px solid var(--base-border-color);
`;

export function BlameMap() {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const team = state.teams[state.context.currentTeamId];

		const adminIds = team.adminIds || [];
		const currentUser = state.users[state.session.userId!];
		const isCurrentUserAdmin = adminIds.includes(state.session.userId!);
		const blameMap = team.settings ? team.settings.blameMap : EMPTY_HASH;
		const mappedBlame = keyFilter(blameMap || {});
		const dontSuggestInvitees = team.settings
			? team.settings.dontSuggestInvitees || EMPTY_HASH_2
			: EMPTY_HASH_2;
		const memberIds = getActiveMemberIds(team);
		const teammates = mapFilter(memberIds, id => {
			const user = state.users[id as string];
			if (!user || !user.isRegistered || user.deactivated || user.externalUserId) return;
			if (user.username === "AI") {
				return;
			}
			if (!user.fullName) {
				let email = user.email;
				if (email) user.fullName = email.replace(/@.*/, "");
			}

			// filter out the current user, as we'll render them first
			if (id === state.session.userId) return;

			return user;
		});
		const invited = mapFilter(memberIds, id => {
			const user = state.users[id as string];
			if (!user || user.isRegistered || user.deactivated || user.externalUserId) return;
			if (user.username === "AI") {
				return;
			}
			let email = user.email;
			if (email) user.fullName = email.replace(/@.*/, "");
			return user;
		});
		return {
			isCurrentUserAdmin,
			mappedBlame,
			currentUserId: state.session.userId!,
			blameMap: blameMap || EMPTY_HASH,
			teamId: team.id,
			autoJoinSupported: isFeatureEnabled(state, "autoJoin"),
			dontSuggestInvitees,
			members: [currentUser, ..._sortBy(teammates, m => (m.fullName || "").toLowerCase())],
			invited,
		};
	});

	const { mappedBlame, blameMap, isCurrentUserAdmin } = derivedState;

	const [blameMapEmail, setBlameMapEmail] = React.useState("");
	const [addingBlameMap, setAddingBlameMap] = React.useState(false);
	const [suggested, setSuggested] = React.useState<any[]>([]);

	useDidMount(() => {
		getSuggestedInvitees();
	});

	const getSuggestedInvitees = async () => {
		// for now, suggested invitees are only available to admins
		// if (!isCurrentUserAdmin) return;

		const result = await HostApi.instance.send(GetLatestCommittersRequestType, {
			includeNoreply: true,
		});
		const committers = result ? result.scm : undefined;
		if (!committers) return;

		const { members, invited, dontSuggestInvitees } = derivedState;
		const newSuggested: any[] = [];
		Object.keys(committers).forEach(email => {
			// We actually want to include noreply emails here, even if we hide them elsewhere
			// if (email.match(/noreply/)) return;
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
			newSuggested.push({ email, fullName: committers[email] || email });
		});
		setSuggested(newSuggested);
	};

	const onBlameMapUserChange = (email: string, person?: CSUser) => {
		if (person) addBlameMap(email, person.id);
		else addBlameMap(email, "");
	};

	const addBlameMap = async (email: string, userId: string) => {
		if (userId) {
			await HostApi.instance.send(AddBlameMapRequestType, {
				teamId: derivedState.teamId,
				userId,
				email,
			});
		} else {
			await HostApi.instance.send(DeleteBlameMapRequestType, {
				teamId: derivedState.teamId,
				email,
			});
		}
		setBlameMapEmail("");
		setAddingBlameMap(false);
	};

	return (
		<Dialog wide title="Blame Map" onClose={() => dispatch(closeModal())}>
			<p className="explainer">
				Your organization's blame map allows you to reassign code responsibility for coworkers with
				multiple email addresses, or who have left your organization. This impacts who gets
				at-mentioned in code comments.
			</p>
			{!isCurrentUserAdmin && (
				<p className="explainer">
					Note that as a non-admin you can only add yourself as a blame map recipient.
				</p>
			)}
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
						<SelectPeople
							title="Handled By"
							multiSelect={false}
							value={[]}
							onlyPerson={isCurrentUserAdmin ? undefined : derivedState.currentUserId}
							extraItems={
								derivedState.isCurrentUserAdmin
									? [
											{ label: "-" },
											{
												icon: <Icon name="trash" />,
												label: "Delete Mapping",
												key: "remove",
												action: () => onBlameMapUserChange(email),
											},
									  ]
									: undefined
							}
							onChange={person => onBlameMapUserChange(email, person)}
						>
							<HeadshotName
								id={blameMap[email]}
								className="no-padding"
								onClick={() => {} /* noop onclick to get cursor pointer */}
							/>
							<Icon name="chevron-down" />
						</SelectPeople>
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
			{!addingBlameMap && (
				<MapRow>
					<div>
						<a onClick={() => setAddingBlameMap(true)}>Add mapping</a>
					</div>
				</MapRow>
			)}
			{addingBlameMap && (
				<MapRow>
					<div style={{ position: "relative" }}>
						<input
							style={{
								width: "calc(100% - 10px)",
								paddingRight: suggested.length > 0 ? "30px !important" : "5px",
							}}
							className="input-text"
							id="blame-map-email"
							type="text"
							value={blameMapEmail}
							onChange={e => setBlameMapEmail(e.target.value)}
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
											action: () => setBlameMapEmail(suggestion.email),
										};
									})}
								></InlineMenu>
							</div>
						)}
					</div>
					<div>
						{EMAIL_REGEX.test(blameMapEmail) && (
							<SelectPeople
								title="Handled By"
								multiSelect={false}
								onlyPerson={isCurrentUserAdmin ? undefined : derivedState.currentUserId}
								value={[]}
								onChange={person => onBlameMapUserChange(blameMapEmail, person)}
							>
								Select Person <Icon name="chevron-down" />
							</SelectPeople>
						)}
					</div>
				</MapRow>
			)}
		</Dialog>
	);
}
