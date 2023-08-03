interface BaseIssueType {
	id: number;
	createdAt: string;
	source: {
		id: string;
		name: string;
		url: string;
		version: string;
		packageManager: string;
	};
	depths: {
		direct: number;
		deep: number;
	};
	statuses: {
		active: number;
		ignored: number;
	};
	projects: [
		{
			id: string;
			status: string;
			depth: number;
			title: string;
		}
	];
	type: string;
}

export interface LicenseDependencyIssue extends BaseIssueType {
	details?: string;
	license: string;
}

export interface LicenseDependencyIssues {
	issues: LicenseDependencyIssue[];
}

export const vulnSeverityList = ["critical", "high", "medium", "low", "unknown"] as const;

export type VulnSeverity = (typeof vulnSeverityList)[number];
export interface VulnerabilityIssue extends BaseIssueType {
	vulnId: string;
	title: string;
	cve: string;
	cvss: number;
	severity: VulnSeverity;
	details: string;
	remediation: string;
	metrics: { name: string; value: string }[];
	cveStatus: string;
	cwes: string[];
	published: string;
	affectedVersionRanges: string[];
	patchedVersionRanges: string[];
	references: string[];
}

export interface VulnerabilityIssues {
	issues: VulnerabilityIssue[];
}

export interface FossaProject {
	id: string;
	title: string;
	branch: string;
	version: string;
	type: string;
	public: boolean;
	scanned: string;
	issues: {
		total: number;
		licensing: number;
		security: number;
		quality: number;
	};
	labels?: string[];
}

export interface GetFossaProjectsResponse {
	projects: FossaProject[];
}

export interface IssueParams {
	category: string;
	type: string;
	page: number;
	sort?: string;
}
