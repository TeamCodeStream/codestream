export interface LicenseDependencyIssue {
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
	details?: string;
	license?: string;
}

export interface VulnerabilityIssue {
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
	vulnId?: string;
	title?: string;
	cve?: string;
	cvss?: number;
	severity?: string;
	details?: string;
	remediation?: string;
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

export interface LicenseDependencyIssues {
	issues: LicenseDependencyIssue[];
}

export interface VulnerabilityIssues {
	issues: VulnerabilityIssue[];
}

export interface IssueParams {
	category: string;
	sort?: string;
	type: string;
	page: number;
}
