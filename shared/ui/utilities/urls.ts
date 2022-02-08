import { URI } from "vscode-uri";

import { Route, RouteControllerType, RouteActionType } from "../ipc/webview.protocol";

export const parseQuery = function(queryString: string) {
	var query = {};
	var pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");
	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i].split("=");
		query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
	}
	return query;
};

export const parseProtocol = function(uriString: string | undefined): Route | undefined {
	if (!uriString) return undefined;

	let uri: URI;
	try {
		const decodedUriString = decodeURIComponent(uriString);
		uri = URI.parse(decodedUriString);
		while (uri.authority.indexOf("codestream") === -1) {
			uri = URI.parse(uri.scheme + ":/" + uri.path);
		}
	} catch (ex) {
		return undefined;
	}
	// removes any empties
	const paths = uri.path.split("/").filter(function(p) {
		return p;
	});

	let controller: RouteControllerType | undefined;
	let action: RouteActionType | undefined;
	let id: string | undefined;
	let parsedQuery;
	if (uri.query) {
		parsedQuery = parseQuery(uri.query) as any;
		if (parsedQuery) {
			controller = parsedQuery.controller;
			action = parsedQuery.action;
			id = parsedQuery.id;
		}
	}

	if (paths.length > 0) {
		if (!controller) {
			controller = paths[0] as RouteControllerType;
		}
		if (!id) {
			id = paths[1];
		}
		if (!action && paths.length > 1) {
			action = paths[2] as RouteActionType;
			if (!action) {
				// some urls don't have an id (like search)
				action = paths[1] as RouteActionType;
			}
		}
	}

	return {
		controller,
		action,
		id,
		query: parsedQuery
	};
};
