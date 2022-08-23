module.exports = {
	env: {
		browser: true,
		es2021: true
	},
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
	overrides: [],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module"
	},
	plugins: ["@typescript-eslint"],
	rules: {
		// TODO Goal: Resolve all of these and remove so they go back to being errors
		"@typescript-eslint/no-namespace": "warn",
		"no-empty": "warn",
		"no-useless-escape": "warn",
		"no-control-regex": "warn",
		"@typescript-eslint/no-inferrable-types": "warn",
		"no-inner-declarations": "warn",
		"no-constant-condition": "warn",
		"no-extra-boolean-cast": "warn",
		"@typescript-eslint/no-empty-function": "warn",
		"@typescript-eslint/ban-ts-comment": "warn",
		"@typescript-eslint/ban-types": "warn",
		"@typescript-eslint/no-this-alias": "warn",
		"prefer-spread": "warn",
		"no-case-declarations": "warn",
		"no-debugger": "warn",
		"prefer-const": "warn",
		"no-useless-catch": "warn",
		"no-mixed-spaces-and-tabs": "off", // Prettier sometimes adds spaces to align stuff - rely on prettier for formatting
		"@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
		"no-prototype-builtins": "warn",
		"@typescript-eslint/no-empty-interface": "warn",
		"no-unsafe-optional-chaining": "warn",
		"@typescript-eslint/no-var-requires": "warn",
		"@typescript-eslint/no-extra-non-null-assertion": "warn",
		"no-async-promise-executor": "warn",
		"no-ex-assign": "warn",
		"prefer-rest-params": "warn"
	}
};
