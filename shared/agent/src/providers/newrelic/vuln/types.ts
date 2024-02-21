import { SeverityType } from "@codestream/protocols/agent";

export type VersionDetails = {
	version?: string;
	criticalVulnerabilities: number;
	highVulnerabilities: number;
	otherVulnerabilities: number;
	vulnerabilities: Array<VulnerabililityDetails>;
	score: number;
	allVulnerabilities: number;
};

export type VulnerableLibrary = {
	name: string;
	language?: string;
	includedVersions?: Array<VersionDetails>;
	suggestedVersion?: VersionDetails;
};

export type EntityLibraries = {
	entityGuid: string;
	libraries: Array<VulnerableLibrary>;
};

export type VulnerabililityDetails = {
	cveId: string;
	title: string;
	description: string;
	url: string;
	score: number;
	vector: string;
	packages: VulnerabilityPackage[];
	updatedAt: number;
	vulnDisclosedAt: number;
	cve: string; //looks unused atm, keeping for reference
	language: string;
};

export type VulnerabilityPackage = {
	remediation: string;
	artifact: string;
	language: string;
	severity: SeverityType;
	versions: string;
};

export type Vulnerabilities = {
	[key: string]: Array<VulnerabililityDetails>;
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
