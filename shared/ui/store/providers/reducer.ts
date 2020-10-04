import { ActionType } from "../common";
import * as actions from "./actions";
import { getUserProviderInfo } from "./actions";
import { ProvidersState, ProvidersActionsType } from "./types";
import { CodeStreamState } from "..";
import { CSMe, CSProviderInfos } from "@codestream/protocols/api";
import { mapFilter, safe } from "@codestream/webview/utils";
import { ThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { createSelector } from "reselect";
import { PROVIDER_MAPPINGS } from "@codestream/webview/Stream/CrossPostIssueControls/types";
import { ContextState } from "../context/types";
import { UsersState } from "../users/types";
import { SessionState } from "../session/types";

type ProviderActions = ActionType<typeof actions>;

const initialState: ProvidersState = {};

interface ThirdPartyTeam {
	icon: string;
	providerId: string;
	teamId: string;
	teamName: string;
}

export function reduceProviders(state = initialState, action: ProviderActions) {
	switch (action.type) {
		case "RESET":
			return initialState;
		case ProvidersActionsType.Update:
			return { ...action.payload };
		default:
			return state;
	}
}

type ProviderPropertyOption = { name: string } | { id: string };
function isNameOption(o: ProviderPropertyOption): o is { name: string } {
	return (o as any).name != undefined;
}

interface LabelHash {
	PullRequest: string;
	Pullrequest: string;
	pullrequest: string;
	PR: string;
	pr: string;
}

const MRLabel = {
	PullRequest: "Merge Request",
	Pullrequest: "Merge request",
	pullrequest: "merge request",
	PR: "MR",
	pr: "mr"
};

const PRLabel = {
	PullRequest: "Pull Request",
	Pullrequest: "Pull request",
	pullrequest: "pull request",
	PR: "PR",
	pr: "pr"
};

export const getPRLabel = createSelector(
	(state: CodeStreamState) => state,
	(state: CodeStreamState): LabelHash => {
		return isConnected(state, { name: "gitlab" }) ||
			isConnected(state, { name: "gitlab_enterprise" })
			? MRLabel
			: PRLabel;
	}
);

export const getPRLabelForProvider = (provider: string): LabelHash => {
	return provider.toLocaleLowerCase().startsWith("gitlab") ? MRLabel : PRLabel;
};

export const isConnected = (
	state: CodeStreamState,
	option: ProviderPropertyOption,
	requiredScope?: string // ONLY WORKS FOR SLACK AND MSTEAMS
) => {
	return isConnectedSelectorFriendly(
		state.users,
		state.context.currentTeamId,
		state.session,
		state.providers,
		option,
		requiredScope
	);
};

// isConnected, as originally written, took `state` as an argument, which means
// that it doesn't work well as a selector since every time anything at all changes
// in state, it wil re-fire. this version takes slices of what's really neeed
// rather than the overall state object.
export const isConnectedSelectorFriendly = (
	users: UsersState,
	currentTeamId: string,
	session: SessionState,
	providers: ProvidersState,
	option: ProviderPropertyOption,
	requiredScope?: string // ONLY WORKS FOR SLACK AND MSTEAMS
) => {
	const currentUser = users[session.userId!] as CSMe;

	// ensure there's provider info for the user
	if (currentUser.providerInfo == undefined) return false;

	if (isNameOption(option)) {
		const providerName = option.name;
		const info = getUserProviderInfo(currentUser, providerName, currentTeamId);
		switch (providerName) {
			case "jiraserver":
			case "github_enterprise":
			case "gitlab_enterprise":
			case "bitbucket_server": {
				// enterprise/on-prem providers need the `hosts` validated
				return (
					info != undefined &&
					info.hosts != undefined &&
					Object.keys(info.hosts).some(host => {
						return providers[host] != undefined && info.hosts![host].accessToken != undefined;
					})
				);
			}
			default: {
				// is there an accessToken for the provider?
				if (info == undefined) return false;
				if (info.accessToken != undefined) return true;

				if (["slack", "msteams"].includes(providerName)) {
					const infoPerTeam = (info as any).multiple as { [key: string]: CSProviderInfos };
					if (requiredScope) {
						if (
							Object.values(infoPerTeam)[0] &&
							// @ts-ignore
							Object.values(infoPerTeam)[0].data.scope.indexOf(requiredScope) === -1
						)
							return false;
					}
					if (infoPerTeam && Object.values(infoPerTeam).some(i => i.accessToken != undefined))
						return true;
				}
				return false;
			}
		}
	} else {
		const providerConfig = providers[option.id];
		const infoForProvider = getUserProviderInfo(currentUser, providerConfig.name, currentTeamId);
		if (infoForProvider == undefined) return false;

		if (!providerConfig.isEnterprise) {
			if (infoForProvider.accessToken) return true;
			const infoPerTeam = (infoForProvider as any).multiple as { [key: string]: CSProviderInfos };
			if (infoPerTeam && Object.values(infoPerTeam).some(i => i.accessToken != undefined))
				return true;
			return false;
		}

		return !!(
			infoForProvider.hosts &&
			infoForProvider.hosts[providerConfig.id] &&
			infoForProvider.hosts[providerConfig.id].accessToken
		);
	}
};

export const getConnectedProviderNames = createSelector(
	(state: CodeStreamState) => state,
	(state: CodeStreamState) => {
		return mapFilter<ThirdPartyProviderConfig, string>(
			Object.values(state.providers),
			providerConfig => (isConnected(state, providerConfig) ? providerConfig.name : undefined)
		);
	}
);

export const getConnectedProviders = createSelector(
	(state: CodeStreamState) => state,
	(state: CodeStreamState) => {
		return Object.values(state.providers).filter(providerConfig =>
			isConnected(state, providerConfig)
		);
	}
);

export const getConnectedSharingTargets = (state: CodeStreamState) => {
	if (state.session.userId == undefined) return [];

	const currentUser = state.users[state.session.userId] as CSMe;

	if (currentUser.providerInfo == undefined) return [];

	const slackProviderInfo = getUserProviderInfo(currentUser, "slack", state.context.currentTeamId);
	const msteamsProviderInfo = getUserProviderInfo(
		currentUser,
		"msteams",
		state.context.currentTeamId
	);

	let teams: ThirdPartyTeam[] = [];

	const slackInfos = safe(() => slackProviderInfo!.multiple);
	if (slackInfos)
		teams = teams.concat(
			Object.entries(slackInfos).map(([teamId, info]) => ({
				icon: PROVIDER_MAPPINGS.slack.icon!,
				providerId: getProviderConfig(state, "slack")!.id,
				teamId,
				teamName: info.data!.team_name
			}))
		);

	const msTeamInfos = safe(() => msteamsProviderInfo!.multiple);
	if (msTeamInfos) {
		const entries = Object.entries(msTeamInfos);
		const len = entries.length;
		teams = teams.concat(
			entries.map(([teamId], index) => {
				return {
					icon: PROVIDER_MAPPINGS.msteams.icon!,
					providerId: getProviderConfig(state, "msteams")!.id,
					teamId,
					teamName: len === 1 ? "MS Teams Org" : `MS Teams Org ${index + 1}`
				};
			})
		);
	}
	return teams;
};

export const getProviderConfig = createSelector(
	(state: CodeStreamState) => state.providers,
	(_, name: string) => name,
	(providerConfigs: ProvidersState, name: string) => {
		for (let id in providerConfigs) {
			if (providerConfigs[id].name === name) return providerConfigs[id];
		}
		return undefined;
	}
);

export const getSupportedPullRequestHosts = createSelector(
	(state: CodeStreamState) => state.providers,
	(providerConfigs: ProvidersState) => {
		return Object.values(providerConfigs).filter(
			_ => _.id === "github*com" || _.id === "github/enterprise"
		);
	}
);

export const getConnectedSupportedPullRequestHosts = createSelector(
	(state: CodeStreamState) => state.users,
	(state: CodeStreamState) => state.context.currentTeamId,
	(state: CodeStreamState) => state.session,
	(state: CodeStreamState) => state.providers,
	(users: UsersState, currentTeamId: string, session: SessionState, providers: ProvidersState) => {
		return Object.values(providers)
			.filter(_ => _.id === "github*com" || _.id === "github/enterprise")
			.filter(_ => isConnectedSelectorFriendly(users, currentTeamId, session, providers, _));
	}
);
