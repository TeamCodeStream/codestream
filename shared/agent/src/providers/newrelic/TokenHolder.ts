import { CSAccessTokenInfo, CSAccessTokenType } from "@codestream/protocols/api";
import { Logger } from "../../logger";

/*
	token was stored in 3+ places before - session.ts, codestreamApi.ts and newRelicProviderInfo. providerInfo is kind of the
	source of truth as it gets pubnub broadcasted and if you have multiple IDEs open it is the only way to get
	tokens updated between IDE
	... but the newRelicProviderInfo is not available at agent bootstrap time so this is the single source of truth and
	we get updates from usersManager.ts (pubnub) to keep it fresh
 */
class TokenHolder {
	private _accessToken: string | undefined;
	private _refreshToken: string | undefined;
	private _expiresAt: number | undefined;
	private _tokenType: CSAccessTokenType | undefined;

	get accessToken(): string | undefined {
		return this._accessToken;
	}

	set accessToken(token: string) {
		this._accessToken = token;
	}

	get refreshToken() {
		return this._refreshToken;
	}

	get expiresAt() {
		return this._expiresAt;
	}

	get tokenType() {
		return this._tokenType;
	}

	get tokenInfo(): CSAccessTokenInfo | undefined {
		if (this._expiresAt && this._tokenType && this._refreshToken) {
			return {
				refreshToken: this._refreshToken,
				expiresAt: this._expiresAt,
				tokenType: this._tokenType as CSAccessTokenType,
			};
		}
		return undefined;
	}

	public setAccessToken(source: string, token: string, tokenInfo?: CSAccessTokenInfo): void {
		this._accessToken = token;
		this._refreshToken = tokenInfo?.refreshToken;
		this._expiresAt = tokenInfo?.expiresAt;
		this._tokenType = tokenInfo?.tokenType;
		const partialToken = token.slice(0, Math.min(8, token.length));

		Logger.log(
			`TokenHolder.setAccessToken: CodeStream API access token ${partialToken} was set from ${source}`
		);
	}
}

export const tokenHolder = new TokenHolder();
