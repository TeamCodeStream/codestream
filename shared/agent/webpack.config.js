"use strict";
const webpack = require("webpack");
const path = require("path");
const { CleanWebpackPlugin: CleanPlugin } = require("clean-webpack-plugin");
const FileManagerPlugin = require("filemanager-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const fs = require("fs");

class CompileStatsPlugin {
	constructor(env) {
		this.enabled = !env.production;
	}
	total = 0;
	count = 0;
	since = Date.now();

	deserialize() {
		if (!fs.existsSync("./stats.json")) {
			return;
		}
		try {
			const dataStr = fs.readFileSync("./stats.json", { encoding: "utf8" });
			const data = JSON.parse(dataStr);
			this.total = data.total;
			this.count = data.count;
			this.since = data.since;
		} catch (e) {
			// ignore
		}
	}

	serialize() {
		fs.writeFileSync(
			"./stats.json",
			JSON.stringify({ count: this.count, total: this.total, since: this.since }, null, 2),
			{ encoding: "utf8" }
		);
	}

	timeSpan(ms) {
		let day, hour, minute, seconds;
		seconds = Math.floor(ms / 1000);
		minute = Math.floor(seconds / 60);
		seconds = seconds % 60;
		hour = Math.floor(minute / 60);
		minute = minute % 60;
		day = Math.floor(hour / 24);
		hour = hour % 24;
		return {
			day,
			hour,
			minute,
			seconds
		};
	}

	done(stats) {
		const elapsed = stats.endTime - stats.startTime;
		this.total += elapsed;
		this.count++;
		const { day, hour, minute, seconds } = this.timeSpan(this.total);
		const totalTime = `${day}d ${hour}h ${minute}m ${seconds}s`;
		this.serialize();
		const sinceStr = new Date(this.since).toLocaleString();
		// nextTick to make stats is last line after webpack logs
		process.nextTick(() =>
			console.info(
				`⌛ compileTime: ${elapsed}ms, compilCount: ${this.count}, totalCompileTime: ${totalTime}, since: ${sinceStr}`
			)
		);
	}

	apply(compiler) {
		if (this.enabled) {
			this.deserialize();
			compiler.hooks.done.tap("done", this.done.bind(this));
		}
	}
}

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
		new webpack.IgnorePlugin({ resourceRegExp: /^worker_threads$/ }),
		new CompileStatsPlugin(env)
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
			extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
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
