import { CriticalityType } from "../../../protocol/agent.protocol.providers";

export type VersionDetails = {
	version?: string;
	criticalVulnerabilities: number;
	highVulnerabilities: number;
	otherVulnerabilities: number;
	vulnerabilities: Array<VulnerabililityDetails>;
};

export type CsecVersionDetails = {
	version?: string;
	criticalVulnerabilities: number;
	highVulnerabilities: number;
	otherVulnerabilities: number;
	vulnerabilities: Array<CsecVulnerabililityDetails>;
};

export type VulnerableLibrary = {
	name: string;
	language?: string;
	includedVersions: Array<VersionDetails>;
	suggestedVersion?: VersionDetails;
};

export type CsecVulnerableLibrary = {
	name: string;
	language?: string;
	includedVersions: Array<CsecVersionDetails>;
	suggestedVersion?: CsecVersionDetails;
};

export type EntityLibraries = {
	entityGuid: string;
	libraries: Array<VulnerableLibrary>;
};

export type CsecEntityLibraries = {
	entityGuid: string;
	libraries: Array<CsecVulnerableLibrary>;
};

export type VulnerabililityDetails = {
	cve: string;
	artifact: string;
	url: string;
	title: string;
	description: string;
	score: number;
	vector: string;
	coordinate: string;
	source?: string;
	cveJson: string;
	language: string;
	criticality: CriticalityType;
	packages: {
		remediation: string;
		artifact: string;
		language: string;
		severity: string; // TODO use same enum?
		versions: string;
	}[];
	versions: Array<Array<string>>;
	remediation: Array<string>;
};

export type CsecVulnerabililityDetails = {
	cve: string;
	artifact: string;
	url: string;
	title: string;
	description: string;
	score: number;
	vector: string;
	coordinate: string;
	source?: string;
	cveJson: string;
	language: string;
	criticality: CriticalityType;
	packages: {
		remediation: string;
		artifact: string;
		language: string;
		severity: string; // TODO use same enum?
		versions: string;
	}[];
	versions: Array<Array<string>>;
	remediation: Array<string>;
};

export type Vulnerabilities = {
	[key: string]: Array<VulnerabililityDetails>;
};

export type CsecVulnerabilities = {
	[key: string]: Array<CsecVulnerabililityDetails>;
};

export type LibraryUsage = {
	inventoryType: string;
	versions: Array<string>;
	entitiesByInventoryChecksum: { [key: string]: string[] };
	name: string;
	inventoryChecksumMetadata: {
		[key: string]: { checksum: string; language: string; version: string };
	};
	vulnerabilities: Vulnerabilities;
	entityGuids: Array<string>;
};

export type CsecLibraryUsage = {
	inventoryType: string;
	versions: Array<string>;
	entitiesByInventoryChecksum: { [key: string]: string[] };
	name: string;
	inventoryChecksumMetadata: {
		[key: string]: { checksum: string; language: string; version: string };
	};
	vulnerabilities: CsecVulnerabilities;
	entityGuids: Array<string>;
};
