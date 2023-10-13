import middleware from "@codestream/webview/store/middleware";
import { Action, configureStore } from "@reduxjs/toolkit";
import { batchedSubscribe } from "redux-batched-subscribe";
import { ThunkAction } from "redux-thunk";
import { reduceApiVersioning } from "../store/apiVersioning/reducer";
import { reduceCodeErrors } from "../store/codeErrors/reducer";
import { reduceCodemarks } from "../store/codemarks/reducer";
import { reduceConnectivity } from "../store/connectivity/reducer";
import { reduceContext } from "../store/context/reducer";
import { reduceDocumentMarkers } from "../store/documentMarkers/reducer";
import { reducePosts } from "../store/posts/reducer";
import { reducePreferences } from "../store/preferences/reducer";
import { reduceProviders } from "../store/providers/reducer";
import { reduceRepos } from "../store/repos/reducer";
import { reduceServices } from "../store/services/reducer";
import { reduceSession } from "../store/session/reducer";
import { reduceStreams } from "../store/streams/reducer";
import { reduceTeams } from "../store/teams/reducer";
import { reduceUnreads } from "../store/unreads/reducer";
import { reduceUsers } from "../store/users/reducer";
import { reduceVersioning } from "../store/versioning/reducer";
import { debounceToAnimationFrame } from "../utils";
import { reduceActiveIntegrations } from "./activeIntegrations/reducer";
import { reduceActivityFeed } from "./activityFeed/reducer";
import { reduceBootstrapped } from "./bootstrapped/reducer";
import reduceCapabilities from "./capabilities/slice";
import { reduceCompanies } from "./companies/reducer";
import reduceConfigs from "./configs/slice";
import { reduceDynamicLogging } from "./dynamicLogging/reducer";
import { reduceEditorContext } from "./editorContext/reducer";
import reduceIde from "./ide/slice";
import providerPullRequests from "./providerPullRequests/slice";
import { reduceReviews } from "./reviews/reducer";

const pluginVersion = (state = "", action) => {
	if (action.type === "@pluginVersion/Set") return action.payload;
	return state;
};

export const store = configureStore({
	reducer: {
		activeIntegrations: reduceActiveIntegrations,
		activityFeed: reduceActivityFeed,
		bootstrapped: reduceBootstrapped,
		capabilities: reduceCapabilities.reducer,
		codemarks: reduceCodemarks,
		companies: reduceCompanies,
		configs: reduceConfigs,
		connectivity: reduceConnectivity,
		context: reduceContext,
		documentMarkers: reduceDocumentMarkers,
		editorContext: reduceEditorContext,
		ide: reduceIde,
		pluginVersion,
		posts: reducePosts,
		preferences: reducePreferences,
		repos: reduceRepos,
		reviews: reduceReviews,
		session: reduceSession,
		streams: reduceStreams,
		teams: reduceTeams,
		umis: reduceUnreads,
		users: reduceUsers,
		services: reduceServices,
		providers: reduceProviders,
		versioning: reduceVersioning,
		apiVersioning: reduceApiVersioning,
		providerPullRequests: providerPullRequests,
		codeErrors: reduceCodeErrors,
		dynamicLogging: reduceDynamicLogging,
	},
	middleware: getDefaultMiddleware => getDefaultMiddleware().concat(middleware),
	enhancers: [batchedSubscribe(debounceToAnimationFrame((notify: Function) => notify()))],
});

export type AppDispatch = typeof store.dispatch;
export type CodeStreamState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	CodeStreamState,
	unknown,
	Action<string>
>;
