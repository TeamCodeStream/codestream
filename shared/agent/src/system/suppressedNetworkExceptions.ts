import { ReportSuppressedMessages } from "../agentError";

export function isSuppressedException(ex: any): ReportSuppressedMessages | undefined {
	const networkErrors = [
		"ENOTFOUND",
		"NOT_FOUND",
		"ETIMEDOUT",
		"EAI_AGAIN",
		"ECONNRESET",
		"ECONNREFUSED",
		"EHOSTUNREACH",
		"ENETDOWN",
		"ENETUNREACH",
		"self signed certificate in certificate chain",
		"socket disconnected before secure",
		"socket hang up",
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
			ex.response.errors &&
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
