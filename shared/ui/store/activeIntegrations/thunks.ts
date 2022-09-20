import {
	FetchThirdPartyBoardsRequestType,
	FetchThirdPartyCardsRequestType,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { logError } from "@codestream/webview/logger";
import { AppThunk } from "@codestream/webview/store";
import {
	setLoading,
	updateForProvider,
} from "@codestream/webview/store/activeIntegrations/actions";
import { HostApi } from "@codestream/webview/webview-api";

const EMPTY_CUSTOM_FILTERS = { selected: "", filters: {} };

const getFilterCustom = (startWorkPreferences: any, providerId: string) => {
	const prefs = startWorkPreferences[providerId] || {};
	return prefs.filterCustom && prefs.filterCustom.filters
		? { ...prefs.filterCustom }
		: EMPTY_CUSTOM_FILTERS;
};

export const fetchBoardsAndCardsAction =
	(activeProviders: ThirdPartyProviderConfig[], force: boolean = false): AppThunk =>
	async (dispatch, getState) => {
		console.debug(
			"Loading boards/cards for providers",
			JSON.stringify(activeProviders.map(p => p.id))
		);
		dispatch(setLoading({ issuesLoading: true }));
		try {
			const startWorkPreferences = getState().preferences.startWork || {};
			await Promise.all([
				dispatch(_fetchBoards(activeProviders, force)),
				dispatch(_fetchCards(activeProviders, startWorkPreferences, force)),
			]);
			dispatch(setLoading({ initialLoadComplete: true }));
		} finally {
			dispatch(setLoading({ issuesLoading: false }));
		}
	};

const _fetchCards =
	(
		activeProviders: ThirdPartyProviderConfig[],
		startWorkPreferences: any,
		force: boolean = false
	): AppThunk =>
	async dispatch => {
		const start = Date.now();
		try {
			await Promise.all(
				activeProviders.map(async provider => {
					try {
						const filterCustom = getFilterCustom(startWorkPreferences, provider.id);
						const response = await HostApi.instance.send(FetchThirdPartyCardsRequestType, {
							customFilter: filterCustom.selected,
							providerId: provider.id,
						});
						dispatch(
							updateForProvider(provider.id, {
								cards: response.cards,
								fetchCardsError: response.error,
							})
						);
					} catch (error) {
						logError(error, { detail: "Error Loading Cards" });
					}
				})
			);
		} finally {
			const elapsed = Date.now() - start;
			console.debug(`Completed _fetchCards \u2022 ${elapsed} ms`);
		}
	};

export const _fetchBoards =
	(activeProviders: ThirdPartyProviderConfig[], force: boolean = false): AppThunk =>
	async dispatch => {
		const start = Date.now();
		try {
			await Promise.all(
				activeProviders.map(async provider => {
					try {
						const response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
							providerId: provider.id,
							force: force,
						});
						dispatch(updateForProvider(provider.id, { boards: response.boards }));
					} catch (error) {
						logError(error, { detail: "Error Loading Boards" });
					}
				})
			);
		} finally {
			const elapsed = Date.now() - start;
			console.debug(`Completed _fetchBoards \u2022 ${elapsed} ms`);
		}
	};
