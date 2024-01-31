import {
	CreateCompanyRequest,
	CreateCompanyRequestType,
	CreateForeignCompanyRequestType,
	EnvironmentHost,
} from "@codestream/protocols/agent";
import { CSCompany } from "@codestream/protocols/api";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { addStreams } from "../streams/actions";
import { addTeams } from "../teams/actions";
import { CompaniesActionsType } from "./types";

export const reset = () => action("RESET");

export const bootstrapCompanies = (companies: CSCompany[]) =>
	action(CompaniesActionsType.Bootstrap, companies);

export const addCompanies = (companies: CSCompany[]) => action(CompaniesActionsType.Add, companies);

export const updateCompany = (company: CSCompany) => action(CompaniesActionsType.Update, company);

export const createCompany = (request: CreateCompanyRequest) => async dispatch => {
	const response = await HostApi.instance.send(CreateCompanyRequestType, request);

	// HostApi.instance.track("Additional Organization Created", {});

	if (response.team) dispatch(addTeams([response.team]));
	if (response.company != undefined) dispatch(addCompanies([response.company]));
	if (response.streams != undefined) dispatch(addStreams(response.streams));

	return response;
};

export const createForeignCompany =
	(request: CreateCompanyRequest, host: EnvironmentHost) => async dispatch => {
		const response = await HostApi.instance.send(CreateForeignCompanyRequestType, {
			request,
			host,
		});

		// HostApi.instance.track("Additional Foreign Organization Created", {});

		let _host = JSON.parse(JSON.stringify(host));
		_host.accessToken = response.accessToken;
		response.company.host = _host;
		if (response.company != undefined) dispatch(addCompanies([response.company]));

		return response.company;
	};
