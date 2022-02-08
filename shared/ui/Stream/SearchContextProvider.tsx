import React from "react";
import { noop } from "../utils";
import { useDispatch } from "react-redux";
import { openPanel, setCurrentCodemark } from "../store/context/actions";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { HostDidReceiveRequestNotificationType } from "../ipc/host.protocol.notifications";
import { parseProtocol } from "../utilities/urls";

export type SearchContextType = {
	query: string;
	setQuery: (query: string) => void;
	goToSearch: (query?: string) => void;
};

const DEFAULT_SEARCH_CONTEXT = { query: "", setQuery: noop, goToSearch: noop } as const;

export const SearchContext = React.createContext<SearchContextType>(DEFAULT_SEARCH_CONTEXT);

export const SearchContextProvider = (props: React.PropsWithChildren<{}>) => {
	const dispatch = useDispatch();
	const [query, setQuery] = React.useState("");
	const goToSearch = React.useCallback((query?: string) => {
		dispatch(openPanel(WebviewPanels.FilterSearch));

		if (query != null && query.length > 0) setQuery(query);
	}, []);

	useDidMount(() => {
		const disposable = HostApi.instance.on(HostDidReceiveRequestNotificationType, async e => {
			const route = parseProtocol(e.url);
			if (!route || !route.controller) return;
			if (route.controller === "search") {
				if (route.action) {
					switch (route.action) {
						case "open": {
							if (route.query) {
								const q = route.query["q"];
								if (q) {
									dispatch(setCurrentCodemark());
									goToSearch(q);
								}
							}
						}
					}
				}
			}
		});

		return () => disposable.dispose();
	});

	return (
		<SearchContext.Provider value={{ query, setQuery, goToSearch }}>
			{props.children}
		</SearchContext.Provider>
	);
};
