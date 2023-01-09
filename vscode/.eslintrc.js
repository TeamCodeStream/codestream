module.exports = {
	env: {
		es2017: true,
		node: true
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:import/recommended",
		"plugin:import/typescript"
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module"
	},
	plugins: ["@typescript-eslint", "unused-imports", "import"],
	rules: {
		"@typescript-eslint/no-unused-vars": "off",
		"unused-imports/no-unused-imports": "warn",
		"unused-imports/no-unused-vars": [
			"warn",
			{ vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }
		],
		"import/order": [
			"warn",
			{
				"newlines-between": "always",
				groups: [
					"builtin",
					"external",
					["internal", "parent", "sibling", "index"],
					"object",
					"type"
				],
				alphabetize: {
					order: "asc" /* sort in ascending order. Options: ['ignore', 'asc', 'desc'] */,
					caseInsensitive: true /* ignore case. Options: [true, false] */
				}
			}
		],
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
		"no-mixed-spaces-and-tabs": "warn",
		"@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
		"no-prototype-builtins": "warn",
		"@typescript-eslint/no-empty-interface": "warn",
		"no-unsafe-optional-chaining": "warn",
		"@typescript-eslint/no-var-requires": "warn",
		"@typescript-eslint/no-extra-non-null-assertion": "warn",
		"no-async-promise-executor": "warn",
		"no-ex-assign": "warn",
		"prefer-rest-params": "warn"
	},
	settings: {
		"import/parsers": {
			"@typescript-eslint/parser": [".ts", ".tsx"]
		},
		"import/resolver": {
			typescript: {
				alwaysTryTypes: true,
				project: "tsconfig.json"
			},
			node: true
		}
	}
};
