import { RequestType } from "vscode-languageserver-protocol";
import { CSCompany, CSTeam } from "./api.protocol";
import { CSStream, CSUser } from "./api.protocol.models";

export interface FetchCompaniesRequest {
	mine?: boolean;
	companyIds?: string[];
}

export interface FetchCompaniesResponse {
	companies: CSCompany[];
}

export const FetchCompaniesRequestType = new RequestType<
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	void,
	void
>("codestream/companies");

export interface GetCompanyRequest {
	companyId: string;
}

export interface GetCompanyResponse {
	company: CSCompany;
}

export const GetCompanyRequestType = new RequestType<
	GetCompanyRequest,
	GetCompanyResponse,
	void,
	void
>("codestream/company");

export interface CreateCompanyRequest {
	name: string;
	domainJoining?: string[];
}

export interface CreateCompanyResponse {
	company: CSCompany;
	team: CSTeam;
	streams?: CSStream[];
}

export const CreateCompanyRequestType = new RequestType<
	CreateCompanyRequest,
	CreateCompanyResponse,
	void,
	void
>("codestream/company/create");

export interface JoinCompanyRequest {
	companyId: string;
}

export interface JoinCompanyResponse {
	company: CSCompany;
	team: CSTeam;
	user: CSUser;
}

export const JoinCompanyRequestType = new RequestType<
	JoinCompanyRequest,
	JoinCompanyResponse,
	void,
	void
>("codestream/companies/join");

export interface UpdateCompanyRequest {
	companyId: string;
	name?: string;
	domainJoining?: string[];
}

export interface UpdateCompanyResponse {
	company: CSCompany;
}

export const UpdateCompanyRequestType = new RequestType<
	UpdateCompanyRequest,
	UpdateCompanyResponse,
	void,
	void
>("codestream/company/update");

export interface DeleteCompanyRequest {
	companyId: string;
}

export interface DeleteCompanyResponse {
	company: CSCompany;
}

export const DeleteCompanyRequestType = new RequestType<
	DeleteCompanyRequest,
	DeleteCompanyResponse,
	void,
	void
>("codestream/company/delete");
