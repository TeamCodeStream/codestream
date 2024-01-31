import { CreateTeamRequest, CreateTeamRequestType } from "@codestream/protocols/agent";
import { CSTeam } from "@codestream/protocols/api";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { addCompanies } from "../companies/actions";
import { addStreams } from "../streams/actions";
import { TeamsActionsType } from "./types";

export const reset = () => action("RESET");

export const bootstrapTeams = (teams: CSTeam[]) => action(TeamsActionsType.Bootstrap, teams);

export const addTeams = (teams: CSTeam[]) => action(TeamsActionsType.Add, teams);

export const updateTeam = (team: CSTeam) => action(TeamsActionsType.Update, team);

export const createTeam = (request: CreateTeamRequest) => async dispatch => {
	const response = await HostApi.instance.send(CreateTeamRequestType, request);

	// HostApi.instance.track("New Team Created", {
	// 	Organization: `${(request as any).companyId ? "Existing" : "New"} Org`,
	// });

	if (response.team) dispatch(addTeams([response.team]));
	if (response.company != undefined) dispatch(addCompanies([response.company]));
	if (response.streams != undefined) dispatch(addStreams(response.streams));

	return response.team || response;
};
