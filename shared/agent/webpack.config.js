"use strict";
const webpack = require("webpack");
const path = require("path");
const { CleanWebpackPlugin: CleanPlugin } = require("clean-webpack-plugin");
const FileManagerPlugin = require("filemanager-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = function(env, argv) {
	env = env || {};
	env.production = Boolean(env.production);

	console.log(`mode production=${env.production}`);

	const onEnd = [
		{
			copy: [
				{
					source: "node_modules/opn/**/xdg-open",
					destination: "dist/"
				},
				{
					source: "dist/agent.*",
					// TODO: Use environment variable if exists
					destination: path.resolve(__dirname, "../../vscode/dist/")
				},
				{
					source: "dist/agent.*",
					// TODO: Use environment variable if exists
					destination: path.resolve(__dirname, "../../atom/dist/")
				},
				{
					source: "dist/agent-pkg.js",
					// TODO: Use environment variable if exists
					destination: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio/dist/agent.js")
				},
				{
					source: "dist/agent-pkg.js.map",
					// TODO: Use environment variable if exists
					destination: path.resolve(
						__dirname,
						"../../vs/src/CodeStream.VisualStudio/dist/agent-pkg.js.map"
					)
				},
				{
					source: "dist/agent-pkg.js",
					// TODO: Use environment variable if exists
					destination: path.resolve(__dirname, "../../jb/src/main/resources/agent/agent-pkg.js")
				},
				{
					source: "dist/agent-pkg.js.map",
					// TODO: Use environment variable if exists
					destination: path.resolve(__dirname, "../../jb/src/main/resources/agent/agent-pkg.js.map")
				}
			]
		}
	];

	/**
	 * @type any[]
	 */
	const plugins = [
		new CleanPlugin({ cleanOnceBeforeBuildPatterns: ["**/*"], verbose: true }),
		new FileManagerPlugin({ events: { onEnd: onEnd } }),
		// Added because of https://github.com/felixge/node-formidable/issues/337
		new webpack.DefinePlugin({ "global.GENTLY": false }),
		// Ignores optional worker_threads require by the write-file-atomic package
		new webpack.IgnorePlugin({ resourceRegExp: /^worker_threads$/ })
	];

	return {
		entry: {
			agent: "./src/main.ts",
			"agent-pkg": "./src/main-vs.ts"
		},
		mode: env.production ? "production" : "development",
		target: "node",
		node: {
			__dirname: false
		},
		devtool: "source-map",
		output: {
			path: path.resolve(process.cwd(), "dist"),
			filename: "[name].js"
		},
		optimization: {
			minimizer: [
				new TerserPlugin({
					parallel: true,
					terserOptions: {
						ecma: 8,
						// Keep the class names otherwise @log won't provide a useful name
						keep_classnames: true,
						module: true
					}
				})
			]
		},
		externals: {
			// these are commented out for good reason ... the socketcluster library we use for
			// pubsub in on-prem will crash if we have these in here ... instead we'll live with
			// a warning from webpack's agent watch - Colin
			// bufferutil: "bufferutil",
			// "utf-8-validate": "utf-8-validate"

			// https://github.com/yan-foto/electron-reload/issues/71
			fsevents: "require('fsevents')"
		},
		module: {
			rules: [
				{
					enforce: "pre",
					exclude: /node_modules/,
					test: /\.ts$/,
					use: "tslint-loader"
				},
				{
					exclude: /node_modules|\.d\.ts$/,
					test: /\.tsx?$/,
					use: "ts-loader"
				},
				{
					test: /\.(graphql|gql)$/,
					exclude: /node_modules|\.d\.ts$/,
					use: [
						{
							loader: "graphql-tag/loader"
						}
					]
				}
			],
			// Removes `Critical dependency: the request of a dependency is an expression` from `./node_modules/vscode-languageserver/lib/files.js`
			exprContextRegExp: /^$/,
			exprContextCritical: false
		},
		resolve: {
			extensions: [".ts", ".tsx", ".js", ".jsx"],
			alias: {
				// https://github.com/auth0/node-auth0/issues/657
				"coffee-script": false,
				vm2: false
			}
		},
		plugins: plugins,
		stats: {
			all: false,
			assets: true,
			builtAt: true,
			env: true,
			errors: true,
			timings: true,
			warnings: true
		}
	};
};
