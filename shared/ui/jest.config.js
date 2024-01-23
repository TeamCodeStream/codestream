module.exports = {
	collectCoverageFrom: [
		"<rootDir>/src/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/Authentication/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/Container/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/Stream/**/*.{js,jsx,ts,tsx}",
		"!<rootDir>/node_modules/",
	],
	coverageReporters: ["clover", "json", "lcov", "text", "teamcity"],
	coverageThreshold: {
		global: {
			lines: 5,
			statements: 5,
		},
	},
	moduleNameMapper: {
		"^react-native$": "react-native-web",
		"^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
		"^lodash-es$": "lodash",
		"^csv-stringify/browser/esm/sync$": "csv-stringify/sync",
		"@codestream/webview/Stream/Markdowner": "<rootDir>/Stream/Markdowner.ts",
		"@codestream/webview/logger": ["<rootDir>/logger.ts"],
		"^@codestream/protocols/agent$": "<rootDir>../util/src/protocol/agent/agent.protocol.ts",
		"^@codestream/protocols/api$": "<rootDir>../util/src/protocol/agent/api.protocol.ts",
		"^@codestream/utils/(.*)": "<rootDir>/../util/src/utils/$1",
		"@codestream/protocols/webview": "<rootDir>/ipc/webview.protocol.ts",
		"@codestream/webview/(.*)": "<rootDir>/$1",
	},
	setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
	testMatch: [
		"<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
	],
	testResultsProcessor: "jest-teamcity-reporter",
	// see https://github.com/jestjs/jest/issues/12036
	transformIgnorePatterns: [
		"node_modules/(?!d3|d3-array|d3-color|d3-path|d3-scale|d3-shape|internmap|delaunator|robust-predicates)",
	],
	watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};
