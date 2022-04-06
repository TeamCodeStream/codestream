import { CSMe } from "@codestream/protocols/api";

export const getUserProviderInfo = (user: CSMe, provider: string, teamId: string) => {
	const providerInfo = user.providerInfo || {};
	const userProviderInfo = providerInfo[provider];
	const teamProviderInfo = providerInfo[teamId] && providerInfo[teamId][provider];
	if (userProviderInfo && userProviderInfo.accessToken) return userProviderInfo;
	else return teamProviderInfo;
};
