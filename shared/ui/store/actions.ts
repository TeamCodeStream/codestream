import { updateCapabilities } from "./capabilities/actions";
import { action } from "./common";
import * as contextActions from "./context/actions";
import * as editorContextActions from "./editorContext/actions";
import { setIde } from "./ide/actions";
import * as preferencesActions from "./preferences/actions";
import { bootstrapRepos } from "./repos/actions";
import { bootstrapServices } from "./services/actions";
import * as sessionActions from "./session/actions";
import { bootstrapStreams } from "./streams/actions";
import { bootstrapTeams } from "./teams/actions";
import { updateUnreads } from "./unreads/actions";
import { updateProviders } from "./providers/actions";
import { bootstrapUsers } from "./users/actions";
import {
	LogoutRequestType,
	SignedInBootstrapData,
	BootstrapInHostResponse,
	LogoutReason
} from "../ipc/host.protocol";
import { HostApi } from "../webview-api";
import { updateConfigs } from "./configs/actions";
import {
	ApiVersionCompatibility,
	BootstrapRequestType,
	VersionCompatibility
} from "@codestream/protocols/agent";
import {
	BootstrapInHostRequestType,
	GetActiveEditorContextRequestType
} from "@codestream/protocols/webview";
import { BootstrapActionType } from "./bootstrapped/types";
import { uuid } from "../utils";
import { upgradeRequired } from "../store/versioning/actions";
import {
	apiCapabilitiesUpdated,
	apiUpgradeRecommended,
	apiUpgradeRequired
} from "../store/apiVersioning/actions";
import { bootstrapCompanies } from "./companies/actions";
import { CSApiCapabilities } from "../protocols/agent/api.protocol.models";

export const reset = () => action("RESET");

export const bootstrap = (data?: SignedInBootstrapData) => async dispatch => {
	if (data == undefined) {
		const api = HostApi.instance;
		const bootstrapCore = await api.send(BootstrapInHostRequestType, undefined);
		if (bootstrapCore.session.userId === undefined) {
			dispatch(
				bootstrapEssentials({
					...bootstrapCore,
					session: { ...bootstrapCore.session, otc: uuid() }
				})
			);
			return;
		}

		const [bootstrapData, { editorContext }] = await Promise.all([
			api.send(BootstrapRequestType, {}),
			api.send(GetActiveEditorContextRequestType, undefined)
		]);
		data = { ...bootstrapData, ...bootstrapCore, editorContext };
	}

	dispatch(bootstrapUsers(data.users));
	dispatch(bootstrapTeams(data.teams));
	dispatch(bootstrapCompanies(data.companies));
	dispatch(bootstrapStreams(data.streams));
	dispatch(bootstrapRepos(data.repos));
	// TODO: I think this should be removed and just live with the caps below
	if (data.capabilities && data.capabilities.services)
		dispatch(bootstrapServices(data.capabilities.services));
	dispatch(updateUnreads(data.unreads));
	dispatch(updateProviders(data.providers));
	dispatch(editorContextActions.setEditorContext(data.editorContext));
	dispatch(preferencesActions.setPreferences(data.preferences));

	dispatch(bootstrapEssentials(data));
};

const bootstrapEssentials = (data: BootstrapInHostResponse) => dispatch => {
	dispatch(setIde(data.ide!));
	dispatch(sessionActions.setSession(data.session));
	dispatch(
		contextActions.setContext({
			hasFocus: true,
			...data.context,
			sessionStart: new Date().getTime()
		})
	);
	dispatch(updateCapabilities(data.capabilities || {}));
	if (data.capabilities) {
		dispatch(apiCapabilitiesUpdated(data.capabilities as CSApiCapabilities));
	}
	dispatch(updateConfigs({ ...data.configs, ...data.environmentInfo }));
	dispatch({ type: "@pluginVersion/Set", payload: data.version });
	dispatch({ type: BootstrapActionType.Complete });

	if (data.versionCompatibility === VersionCompatibility.UnsupportedUpgradeRequired) {
		dispatch(upgradeRequired());
	} else if (data.apiVersionCompatibility === ApiVersionCompatibility.ApiUpgradeRequired) {
		dispatch(apiUpgradeRequired());
	} else if (data.apiVersionCompatibility === ApiVersionCompatibility.ApiUpgradeRecommended) {
		dispatch(apiUpgradeRecommended(data.missingCapabilities || {}));
	}

	dispatch(apiCapabilitiesUpdated(data.apiCapabilities || {}));
};
