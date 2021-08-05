import { AccessToken } from "@codestream/protocols/agent";
import { Logger } from "logger";
import { GlobalState } from "../common";
import { extensionId } from "../constants";
import { Container } from "../container";
import { keychain } from "../keychain";

const CredentialService = `${extensionId}:vscode`;

interface TokenMap {
	[key: string]: AccessToken | undefined;
}

export namespace TokenManager {
	function toKey(url: string, email: string) {
		return `${url}|${email}`.toLowerCase();
	}

	function getTokenMap() {
		return (
			Container.context.globalState.get<TokenMap>(GlobalState.AccessTokens) ||
			(Object.create(null) as TokenMap)
		);
	}

	export async function addOrUpdate(url: string, email: string, token: AccessToken) {
		if (!url || !email) return;

		const key = toKey(url, email);

		if (keychain !== undefined) {
			try {
				await keychain.setPassword(CredentialService, key, JSON.stringify(token));
				return;
			} catch (ex) {
				Logger.error(ex, "TokenManager.addOrUpdate: Failed to set credentials");
			}
		}

		Logger.log("TokenManager.addOrUpdate: Falling back to use local storage");

		const tokens = getTokenMap();
		tokens[key] = token;
		await Container.context.globalState.update(GlobalState.AccessTokens, tokens);
	}

	export async function clear(url: string, email: string) {
		if (!url || !email) return;

		const key = toKey(url, email);

		if (keychain !== undefined) {
			try {
				await keychain.deletePassword(CredentialService, key);
			} catch (ex) {
				Logger.error(ex, "TokenManager.clear: Failed to clear credentials");
			}
		}

		const tokens = getTokenMap();
		if (tokens[key] === undefined) return;

		delete tokens[key];
		await Container.context.globalState.update(GlobalState.AccessTokens, tokens);
	}

	// export async function clearAll() {
	// 	await Container.context.globalState.update(GlobalState.AccessTokens, undefined);
	// }

	export async function getGeneric(key: string): Promise<any | undefined> {
		if (!key) return undefined;

		if (keychain !== undefined) {
			try {
				const tokenJson = await keychain.getPassword(CredentialService, key);
				if (tokenJson != null) {
					return tokenJson;
				}
			} catch (ex) {
				Logger.warn(ex);
			}
		}
		return undefined;
	}

	export async function setGeneric(key: string, value: string): Promise<boolean | undefined> {
		if (!key) return false;

		if (keychain !== undefined) {
			try {
				await keychain.setPassword(CredentialService, key, value);
				return true;
			} catch (ex) {
				Logger.warn(ex);
			}
		}
		return false;
	}

	export async function get(url: string, email: string): Promise<AccessToken | undefined> {
		if (!url || !email) return undefined;

		const key = toKey(url, email);

		let migrate = false;
		if (keychain !== undefined) {
			migrate = true;
			try {
				const tokenJson = await keychain.getPassword(CredentialService, key);
				if (tokenJson != null) {
					return JSON.parse(tokenJson) as AccessToken;
				}
			} catch (ex) {
				migrate = false;
			}
		}

		Logger.log(`TokenManager.get: Checking local storage; migrate=${migrate}`);

		const tokens = getTokenMap();
		const token = tokens[key];

		if (migrate && token !== undefined) {
			await migrateTokenToKeyChain(key, token, tokens);
		}
		return token;
	}

	async function migrateTokenToKeyChain(
		key: string,
		token: AccessToken | undefined,
		tokens: TokenMap
	) {
		if (keychain === undefined || token === undefined) return;

		try {
			await keychain.setPassword(CredentialService, key, JSON.stringify(token));
		} catch (ex) {
			Logger.error(ex, "TokenManager.migrateTokenToKeyChain: Failed to migrate credentials");
			return;
		}

		delete tokens[key];
		await Container.context.globalState.update(GlobalState.AccessTokens, tokens);
	}
}
