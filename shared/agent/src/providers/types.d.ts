export interface ProviderVersion {
	/**
	 * Semantic version, aka X.Y.Z
	 *
	 * @type {string}
	 * @memberof ProviderVersion
	 */
	version: string;
	/**
	 * version as an array
	 *
	 * @type {number[]}
	 * @memberof ProviderVersion
	 */
	asArray: number[];
	/**
	 * optional revision information, GitLab has this
	 *
	 * @type {string}
	 * @memberof ProviderVersion
	 */
	revision?: string;
	/**
	 * optional edition information like "ee". Gitlab has this
	 *
	 * @type {string}
	 * @memberof ProviderVersion
	 */
	edition?: string;

	/**
	 * true if the version is 0.0.0
	 */
	isDefault?: boolean;

	/**
	 * true if we're not able to get a version from the api
	 */
	isLowestSupportedVersion?: boolean;
}
