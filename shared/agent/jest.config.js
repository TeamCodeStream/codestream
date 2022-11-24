/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	globalSetup: "./jest.global.js",
	moduleNameMapper: {
		"^timed-cache$": "<rootDir>/node_modules/timed-cache/dist/cache.min.js",
		"^@codestream/protocols/agent$": "<rootDir>../util/src/protocol/agent/agent.protocol.ts",
		"^@codestream/protocols/api$": "<rootDir>../util/src/protocol/agent/api.protocol.ts",
		"^@codestream/utils/(.*)": "<rootDir>/../util/src/utils/$1",
		"^lodash-es$": "lodash",
	},
	preset: "ts-jest",
	reporters: ["default", "jest-teamcity"], // jest-teamcity OK here since it only works when TEAMCITY_VERSION env var set
	testEnvironment: "node",
	transform: {
		"\\.(gql|graphql)$": "jest-transform-graphql",
	},
};
