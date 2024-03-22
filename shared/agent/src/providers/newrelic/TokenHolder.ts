import {
	CSAccessTokenInfo,
	CSAccessTokenType,
	CSNewRelicProviderInfo,
} from "@codestream/protocols/api";
import { Logger } from "../../logger";
import { SessionContainer } from "../../container";
import { UsersManager } from "../../managers/usersManager";
import { User } from "../../api/extensions";

class TokenHolder {
	// Server broadcasts updates to the User which is cached in UsersManager so that is the single source of truth for auth info
	private _usersManager: UsersManager | undefined;

	get usersManager(): UsersManager | undefined {
		if (!this._usersManager) {
			if (SessionContainer.isInitialized() && SessionContainer.instance()) {
				this._usersManager = SessionContainer.instance().users;
			}
		}
		return this._usersManager;
	}

	get providerInfo(): CSNewRelicProviderInfo | undefined {
		if (SessionContainer.isInitialized() && SessionContainer.instance()) {
			const user = this.usersManager?.getMeCached();
			if (user) {
				return User.getProviderInfo<CSNewRelicProviderInfo>(
					user,
					SessionContainer.instance().session.teamId,
					"newrelic"
				);
			}
		}
		return undefined;
	}

	get accessToken(): string | undefined {
		return this.providerInfo?.accessToken;
	}

	set accessToken(token: string) {
		if (this.providerInfo) {
			this.providerInfo.accessToken = token;
		}
	}

	get tokenInfo(): CSAccessTokenInfo | undefined {
		if (
			this.providerInfo &&
			this.providerInfo.expiresAt &&
			this.providerInfo.tokenType &&
			this.providerInfo.refreshToken
		) {
			return {
				refreshToken: this.providerInfo.refreshToken,
				expiresAt: this.providerInfo.expiresAt,
				tokenType: this.providerInfo.tokenType as CSAccessTokenType,
			};
		}
		return undefined;
	}

	get refreshToken() {
		return this.providerInfo?.refreshToken;
	}

	get expiresAt() {
		return this.providerInfo?.expiresAt;
	}

	get tokenType() {
		return this.providerInfo?.tokenType;
	}

	setAccessToken(token: string, tokenInfo?: CSAccessTokenInfo) {
		if (this.providerInfo) {
			this.providerInfo.accessToken = token;
			if (tokenInfo) {
				this.providerInfo.expiresAt = tokenInfo.expiresAt;
				this.providerInfo.tokenType = tokenInfo.tokenType;
				this.providerInfo.refreshToken = tokenInfo.refreshToken;
			}
		}
		Logger.log("CodeStream API access token was set");
	}
}

export const tokenHolder = new TokenHolder();
