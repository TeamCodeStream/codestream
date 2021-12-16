module.exports = {
	env: {
		es2017: true,
		node: true
	},
	ignorePatterns: ["dist/", "node_modules/", "src/protocols"],
	settings: {},
	extends: [],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "tsconfig.json",
		sourceType: "module"
	},
	plugins: ["@typescript-eslint", "@typescript-eslint/tslint", "import"],
	rules: {
		"@typescript-eslint/adjacent-overload-signatures": "error",
		"@typescript-eslint/array-type": "error",
		"@typescript-eslint/class-name-casing": "error",
		"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as" }],
		"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
		"@typescript-eslint/member-delimiter-style": [
			"warn",
			{
				multiline: {
					delimiter: "semi",
					requireLast: true
				},
				singleline: {
					delimiter: "semi",
					requireLast: false
				}
			}
		],
		"@typescript-eslint/no-inferrable-types": [
			"warn",
			{ ignoreParameters: true, ignoreProperties: true }
		],
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
		],
		"@typescript-eslint/no-var-requires": "warn",
		"@typescript-eslint/prefer-for-of": "warn",
		"@typescript-eslint/prefer-namespace-keyword": "error",
		"@typescript-eslint/quotes": [
			"warn",
			"double",
			{
				avoidEscape: true
			}
		],
		"@typescript-eslint/semi": "error",
		"@typescript-eslint/triple-slash-reference": "warn",
		"@typescript-eslint/type-annotation-spacing": "warn",
		"arrow-body-style": ["warn", "as-needed"],
		"arrow-parens": ["warn", "as-needed"],
		camelcase: "warn",
		curly: ["error", "multi-line"],
		"eol-last": "error",
		eqeqeq: ["error", "smart"],
		"import/no-default-export": "warn",
		"import/order": "warn",
		"linebreak-style": ["error", "unix"],
		"new-parens": "error",
		"no-eval": "error",
		"no-irregular-whitespace": ["error", { skipStrings: false }],
		"no-multiple-empty-lines": [
			"error",
			{
				max: 1
			}
		],
		"no-redeclare": "warn",
		"no-throw-literal": "warn",
		"no-trailing-spaces": "warn",
		"no-unsafe-finally": "warn",
		"no-unused-expressions": [
			"error",
			{ allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }
		],
		"no-var": "error",
		"one-var": ["warn", "never"],
		"prefer-const": "warn",
		"prefer-template": "warn",
		"quote-props": ["warn", "as-needed"],
		"space-before-function-paren": "off",
		"spaced-comment": "error",
		"use-isnan": "error",
		"@typescript-eslint/tslint/config": [
			"error",
			{
				rules: {
					"no-unnecessary-callback-wrapper": true,
					"prefer-method-signature": true
				}
			}
		]
	}
};
