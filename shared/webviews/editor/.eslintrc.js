module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:import/recommended",
		"plugin:import/typescript",
	],
	overrides: [],
	ignorePatterns: ["newrelic-browser.js"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "unused-imports", "import"],
	rules: {
		"@typescript-eslint/no-unused-vars": "off",
		"unused-imports/no-unused-imports": "warn",
		"unused-imports/no-unused-vars": [
			"warn",
			{ vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
		],
		// TODO Goal: Resolve all of these and remove so they go back to being errors
		"no-var": "warn",
		"no-useless-escape": "warn",
		"no-constant-condition": "warn",
		"@typescript-eslint/no-inferrable-types": "warn",
		"@typescript-eslint/ban-ts-comment": "warn",
		"prefer-const": "warn",
		"no-empty": "warn",
		"@typescript-eslint/ban-types": "warn",
		"@typescript-eslint/no-empty-function": "warn",
		"@typescript-eslint/no-empty-interface": "warn",
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/no-var-requires": "warn",
		"@typescript-eslint/triple-slash-reference": "warn",
		"no-case-declarations": "warn",
		"no-useless-catch": "warn",
		"@typescript-eslint/no-unnecessary-type-constraint": "warn",
		"no-mixed-spaces-and-tabs": "off", // Prettier sometimes adds spaces to align stuff - rely on prettier for formatting
		"no-extra-boolean-cast": "warn",
		"no-debugger": "warn",
		"no-undef": "warn",
		"@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
		"no-prototype-builtins": "warn",
		"no-fallthrough": "warn",
		"no-irregular-whitespace": "warn",
		"prefer-spread": "warn",
		"@typescript-eslint/no-this-alias": "warn",
	},
	settings: {
		"import/parsers": {
			"@typescript-eslint/parser": [".ts", ".tsx"],
		},
		"import/resolver": {
			typescript: {
				alwaysTryTypes: true,
				project: "tsconfig.json",
			},
			node: true,
		},
	},
};
