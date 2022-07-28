import { ReportSuppressedMessages } from "../agentError";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	DocumentMarker,
	DocumentMarkerExternalContent
} from "../protocol/agent.protocol.documentMarkers";
import {
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersResponse
} from "../protocol/agent.protocol.providers";
import { CSProviderInfos } from "../protocol/api.protocol.models";
import { log } from "../system/decorators/log";
import {
	ProviderCreatePullRequestRequest,
	ProviderVersion,
	PullRequestComment,
	ThirdPartyIssueProvider,
	ThirdPartyProviderSupportsCreatingPullRequests,
	ThirdPartyProviderSupportsIssues,
	ThirdPartyProviderSupportsViewingPullRequests
} from "./provider";
import { ThirdPartyProviderBase } from "./thirdPartyProviderBase";

export abstract class ThirdPartyIssueProviderBase<
	TProviderInfo extends CSProviderInfos = CSProviderInfos
> extends ThirdPartyProviderBase<TProviderInfo> implements ThirdPartyIssueProvider {
	private _pullRequestDocumentMarkersCache = new Map<
		string,
		{ documentVersion: number; promise: Promise<DocumentMarker[]> }
	>();

	protected invalidatePullRequestDocumentMarkersCache() {
		this._pullRequestDocumentMarkersCache.clear();
	}

	supportsIssues(): this is ThirdPartyIssueProvider & ThirdPartyProviderSupportsIssues {
		return ThirdPartyIssueProvider.supportsIssues(this);
	}

	supportsViewingPullRequests(): this is ThirdPartyIssueProvider &
		ThirdPartyProviderSupportsViewingPullRequests {
		return ThirdPartyIssueProvider.supportsViewingPullRequests(this);
	}

	supportsCreatingPullRequests(): this is ThirdPartyIssueProvider &
		ThirdPartyProviderSupportsCreatingPullRequests {
		return ThirdPartyIssueProvider.supportsCreatingPullRequests(this);
	}

	protected createDescription(request: ProviderCreatePullRequestRequest): string | undefined {
		if (
			!request ||
			request.description == null ||
			!request.metadata ||
			(!request.metadata.reviewPermalink && !request.metadata.addresses)
		) {
			return request.description;
		}

		if (request.metadata.reviewPermalink) {
			request.description += `\n\n\n[Changes reviewed on CodeStream](${
				request.metadata.reviewPermalink
			}?src=${encodeURIComponent(this.displayName)})`;
			if (request.metadata.reviewers) {
				request.description += ` by ${request.metadata.reviewers?.map(_ => _.name)?.join(", ")}`;
			}
			if (request.metadata.approvedAt) {
				request.description += ` on ${new Date(
					request.metadata.approvedAt
				).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
			}
		}
		if (request.metadata.addresses) {
			let addressesText = "\n\n**This PR Addresses:**  \n";
			let foundOneWithUrl = false;
			request.metadata.addresses.forEach(issue => {
				addressesText += `[${issue.title}](${issue.url})  \n`;
				if (issue.url) foundOneWithUrl = true;
			});
			if (foundOneWithUrl) request.description += addressesText;
		}
		const codeStreamLink = `https://codestream.com/?utm_source=cs&utm_medium=pr&utm_campaign=${encodeURI(
			request.providerId
		)}`;
		let createdFrom = "";
		switch (request.ideName) {
			case "VSC":
				createdFrom = "from VS Code";
				break;
			case "JETBRAINS":
				createdFrom = "from JetBrains";
				break;
			case "VS":
				createdFrom = "from Visual Studio";
				break;
			case "ATOM":
				createdFrom = "from Atom";
				break;
		}
		let codeStreamAttribution = `Created ${createdFrom} using [CodeStream](${codeStreamLink})`;
		if (!["bitbucket*org", "bitbucket/server"].includes(request.providerId)) {
			codeStreamAttribution = `<sup> ${codeStreamAttribution}</sup>`;
		}
		request.description += `\n\n${codeStreamAttribution}`;
		return request.description;
	}

	protected async isPRApiCompatible(): Promise<boolean> {
		return true;
	}

	protected async isPRCreationApiCompatible(): Promise<boolean> {
		return true;
	}

	protected getPRExternalContent(
		comment: PullRequestComment
	): DocumentMarkerExternalContent | undefined {
		return undefined;
	}

	protected _isSuppressedException(ex: any): ReportSuppressedMessages | undefined {
		const networkErrors = [
			"ENOTFOUND",
			"ETIMEDOUT",
			"EAI_AGAIN",
			"ECONNRESET",
			"ECONNREFUSED",
			"EHOSTUNREACH",
			"ENETDOWN",
			"ENETUNREACH",
			"self signed certificate in certificate chain",
			"socket disconnected before secure",
			"socket hang up"
		];

		if (ex.message && networkErrors.some(e => ex.message.match(new RegExp(e)))) {
			return ReportSuppressedMessages.NetworkError;
		} else if (ex.message && ex.message.match(/GraphQL Error \(Code: 404\)/)) {
			return ReportSuppressedMessages.ConnectionError;
		}
		// else if (
		// 	(ex?.response?.message || ex?.message || "").indexOf(
		// 		"enabled OAuth App access restrictions"
		// 	) > -1
		// ) {
		// 	return ReportSuppressedMessages.OAuthAppAccessRestrictionError;
		// }
		else if (
			(ex.response && ex.response.message === "Bad credentials") ||
			(ex.response &&
				ex.response.errors instanceof Array &&
				ex.response.errors.find((e: any) => e.type === "FORBIDDEN"))
		) {
			// https://issues.newrelic.com/browse/NR-23727 - FORBIDDEN can happen for tokens that don't have full permissions,
			// rather than risk breaking how this works, we'll just capture this one possibility
			if (ex.response.errors.find((e: any) => e.message.match(/must have push access/i))) {
				return undefined;
			} else {
				return ReportSuppressedMessages.AccessTokenInvalid;
			}
		} else if (ex.message && ex.message.match(/must accept the Terms of Service/)) {
			return ReportSuppressedMessages.GitLabTermsOfService;
		} else {
			return undefined;
		}
	}

	protected trySetThirdPartyProviderInfo(
		ex: Error,
		exType?: ReportSuppressedMessages | undefined
	): void {
		if (!ex) return;

		exType = exType || this._isSuppressedException(ex);
		if (exType !== undefined && exType !== ReportSuppressedMessages.NetworkError) {
			// we know about this error, and we want to give the user a chance to correct it
			// (but throwing up a banner), rather than logging the error to sentry
			this.session.api.setThirdPartyProviderInfo({
				providerId: this.providerConfig.id,
				data: {
					tokenError: {
						error: ex,
						occurredAt: Date.now(),
						isConnectionError: exType === ReportSuppressedMessages.ConnectionError,
						providerMessage:
							exType === ReportSuppressedMessages.OAuthAppAccessRestrictionError ? ex.message : null
					}
				}
			});
			if (this._client) {
				delete this._client;
			}
		}
	}

	getOwnerFromRemote(remote: string): { owner: string; name: string } {
		return {
			owner: "",
			name: ""
		};
	}

	/**
	 * Repos that are opened in the editor
	 * @returns array of owner/repo strings
	 */
	protected async getOpenedRepos(): Promise<string[]> {
		const repos: string[] = [];
		const { scm, providerRegistry } = SessionContainer.instance();
		const reposResponse = await scm.getRepos({ inEditorOnly: true, includeProviders: true });
		if (!reposResponse.repositories || !reposResponse.repositories.length) return repos;

		for (const repo of reposResponse.repositories) {
			if (!repo.remotes) continue;

			for (const remote of repo.remotes) {
				const urlToTest = remote.webUrl;
				const results = await providerRegistry.queryThirdParty({ url: urlToTest });
				if (results && results.providerId === this.providerConfig.id) {
					const ownerData = this.getOwnerFromRemote(urlToTest);
					if (ownerData) {
						repos.push(`${ownerData.owner}/${ownerData.name}`);
					}
				}
			}
		}

		return repos;
	}

	protected async getVersion(): Promise<ProviderVersion> {
		this._version = this.DEFAULT_VERSION;
		return this._version;
	}

	protected handleProviderError(ex: any, request: any) {
		Logger.error(ex, `${this.displayName}: handleProviderError`, {
			request
		});

		let errorMessage = undefined;
		if (ex?.info?.error?.message) {
			// this is some kind of fetch / network error
			errorMessage = ex.info.error.message;
		}
		if (ex?.response?.errors?.length) {
			// this is some kind of provider error
			errorMessage = ex.response.errors[0].message || "Unknown error";
		}
		if (!errorMessage) {
			if (ex?.message) {
				// generic error
				errorMessage = ex.message;
			} else {
				// some other kind of error
				errorMessage = ex?.toString();
			}
		}

		errorMessage = `${this.displayName}: ${errorMessage || `Unknown error`}`;
		return {
			error: {
				type: "PROVIDER",
				message: errorMessage
			}
		};
	}

	@log()
	async getAssignableUsersAutocomplete(
		request: FetchAssignableUsersAutocompleteRequest
	): Promise<FetchAssignableUsersResponse> {
		throw new Error("ERR_METHOD_NOT_IMPLEMENTED");
	}
}
