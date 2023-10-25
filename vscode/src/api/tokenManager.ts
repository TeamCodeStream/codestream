import { AccessToken } from "@codestream/protocols/agent";

import { Logger } from "../logger";
import { GlobalState } from "../common";
import { extensionId } from "../constants";
import { Container } from "../container";

export enum SaveTokenReason {
	COPY = "COPY",
	LOGIN_SUCCESS = "LOGIN_SUCCESS",
	LOGOUT = "LOGOUT",
	LOGIN_ERROR = "LOGIN_ERROR",
	AUTO_SIGN_IN = "AUTO_SIGN_IN",
	SIGN_IN_COMMAND = "SIGN_IN_COMMAND",
	UPDATE_SERVER_URL = "UPDATE_SERVER_URL",
	SERVER_MIGRATION = "SERVER_MIGRATION",
	REFRESH = "REFRESH"
}

const CredentialService = `${extensionId}:vscode`;

interface TokenMap {
	[key: string]: AccessToken | undefined;
}

function toKey(url: string, email: string, teamId?: string) {
	let key = `${url}|${email}`;
	if (teamId) {
		key += `|${teamId}`;
	}
	return key.toLowerCase();
}

function getTokenMap() {
	return (
		Container.context.globalState.get<TokenMap>(GlobalState.AccessTokens) ||
		(Object.create(null) as TokenMap)
	);
}

function getKeychain() {
	try {
		// Using esbuild.ts externals to make sure keytar is not bundled and uses vscode keytar
		return require("keytar");
	} catch (e) {
		// ignore
	}
	return undefined;
}

export async function addOrUpdate(
	saveTokenReason: SaveTokenReason,
	url: string,
	email: string,
	teamId: string,
	token: AccessToken
) {
	if (!url || !email) {
		Logger.warn(`TokenManager.addOrUpdate ${saveTokenReason} missing url / email`);
		return;
	}

	const key = toKey(url, email, teamId);

	Logger.log(`TokenManager.addOrUpdate key: ${key} ${saveTokenReason}`);

	const secretApi = Container.context.secrets;

	if (secretApi !== undefined) {
		try {
			await secretApi.store(key, JSON.stringify(token));
			Logger.log(`TokenManager.addOrUpdate ${saveTokenReason} completed`);
		} catch (ex) {
			Logger.error(ex, "TokenManager.addOrUpdate: Failed to set credentials");
		}
	} else {
		Logger.error(
			new Error("TokenManager.addOrUpdate: Failed to set credentials: secretApi is undefined")
		);
	}
}

export async function clear(
	saveTokenReason: SaveTokenReason,
	url: string,
	email: string,
	teamId?: string
) {
	if (!url || !email) {
		Logger.warn("TokenManager.clear missing url / email");
		return;
	}

	const key = toKey(url, email, teamId);

	Logger.log(`TokenManager.clear key: ${key} ${saveTokenReason}`);

	const secretApi = Container.context.secrets;

	if (secretApi !== undefined) {
		try {
			await secretApi.delete(key);
			Logger.log(`TokenManager.cleared ${saveTokenReason}`);
		} catch (ex) {
			Logger.error(ex, "TokenManager.clear: Failed to clear credentials");
		}
	}

	// Keep clearing out legacy tokens
	const tokens = getTokenMap();
	if (tokens[key] === undefined) return;

	delete tokens[key];
	await Container.context.globalState.update(GlobalState.AccessTokens, tokens);

	const keychain = getKeychain();
	if (keychain) {
		try {
			await keychain.deletePassword(CredentialService, key);
		} catch (e) {
			Logger.warn(`TokenManager.clear: Failed to cleanup keytar creds ${e.message}`);
		}
	}
}

export async function get(
	url: string,
	email: string,
	teamId?: string
): Promise<AccessToken | undefined> {
	if (!url || !email) return undefined;

	const key = toKey(url, email, teamId);
	Logger.log(`TokenManager.get key: ${key}`);
	Logger.log(`TokenManager.get key: ${key}`);
	let migrate = false;
	const secretApi = Container.context.secrets;
	if (secretApi !== undefined) {
		migrate = true;
		try {
			const tokenJson = await secretApi.get(key);
			if (tokenJson) {
				Logger.log(`TokenManager.get success`);
				return JSON.parse(tokenJson) as AccessToken;
			}
		} catch (ex) {
			Logger.error(ex, "TokenManager.get: Failed to get credentials");
			migrate = false;
		}
	}

	let token: undefined | AccessToken = undefined;
	const keychain = getKeychain();
	if (keychain) {
		Logger.log(`TokenManager.get: Checking keytar storage; migrate=${migrate}`);
		const tokenJson = (await keychain.getPassword(CredentialService, key)) ?? undefined;
		token = tokenJson ? (JSON.parse(tokenJson) as AccessToken) : undefined;
	}

	let tokenMap: TokenMap | undefined = undefined;
	if (!token) {
		Logger.log(`TokenManager.get: Checking local storage; migrate=${migrate}`);
		tokenMap = getTokenMap();
		token = tokenMap[key];
	}

	if (migrate && token !== undefined) {
		await migrateTokenToSecretStorage(key, token, tokenMap);
	}
	return token;
}

// Given a token from keytar or local storage, migrate it to the vscode secret storage
async function migrateTokenToSecretStorage(
	key: string,
	token: AccessToken | undefined,
	tokens?: TokenMap
) {
	const secretApi = Container.context.secrets;
	if (secretApi === undefined || token === undefined) return;

	try {
		await secretApi.store(key, JSON.stringify(token));
	} catch (ex) {
		Logger.error(ex, "TokenManager.migrateTokenToKeyChain: Failed to migrate credentials");
		return;
	}

	if (tokens) {
		delete tokens[key];
	}

	await Container.context.globalState.update(GlobalState.AccessTokens, tokens);

	const keychain = getKeychain();
	if (keychain) {
		await keychain.deletePassword(CredentialService, key);
	}
}
