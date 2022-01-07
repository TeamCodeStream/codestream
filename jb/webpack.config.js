"use strict";
const webpack = require("webpack");
const fs = require("fs");
const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = function(env, argv) {
	env = env || {};
	env.analyzeBundle = Boolean(env.analyzeBundle);
	env.production = env.analyzeBundle || Boolean(env.production);
	env.reset = Boolean(env.reset);
	env.watch = Boolean(argv.watch || argv.w);
	const mode = env.production ? "production" : "development";

	console.log(JSON.stringify({ mode, ...env }, null, 4));

	let protocolPath = path.resolve(__dirname, "src/protocols");
	if (!fs.existsSync(protocolPath)) {
		console.warn("Creating protocol folder...");
		fs.mkdirSync(protocolPath);
	}

	console.log("Ensuring extension symlink to the agent protocol folder...");
	createFolderSymlinkSync(
		path.resolve(__dirname, "../shared/agent/src/protocol"),
		path.resolve(protocolPath, "agent"),
		env
	);

	console.log("Ensuring extension symlink to the webview protocol folder...");
	createFolderSymlinkSync(
		path.resolve(__dirname, "../shared/ui/ipc"),
		path.resolve(protocolPath, "webview"),
		env
	);

	protocolPath = path.resolve(__dirname, "../shared/ui/protocols");
	if (!fs.existsSync(protocolPath)) {
		fs.mkdirSync(protocolPath);
	}

	console.log("Ensuring webview symlink to the agent protocol folder...");
	createFolderSymlinkSync(
		path.resolve(__dirname, "../shared/agent/src/protocol"),
		path.resolve(protocolPath, "agent"),
		env
	);

	const context = path.resolve(__dirname, "webview");

	const plugins = [
		new CleanWebpackPlugin({
			cleanOnceBeforeBuildPatterns: ["**/*"],
			verbose: true
		}),
		new webpack.DefinePlugin(
			Object.assign(
				{ "global.atom": false },
				mode === "production" ? { "process.env.NODE_ENV": JSON.stringify("production") } : {}
			)
		),
		new MiniCssExtractPlugin({
			filename: "webview.css"
		}),
		new HtmlPlugin({
			template: "index.html",
			filename: "webview.html",
			inject: true,
			minify:
				mode === "production"
					? {
							removeComments: true,
							collapseWhitespace: true,
							removeRedundantAttributes: true,
							useShortDoctype: true,
							removeEmptyAttributes: true,
							removeStyleLinkTypeAttributes: true,
							keepClosingSlash: true
					  }
					: false
		}),
		new ForkTsCheckerPlugin({
			async: false
		})
	];

	if (env.analyzeBundle) {
		plugins.push(new BundleAnalyzerPlugin());
	}

	return {
		name: "webview",
		context: context,
		entry: {
			webview: ["./index.ts", "./styles/webview.less"]
		},
		mode: env.production ? "production" : "development",
		node: false,
		devtool: !env.production ? "eval-source-map" : undefined,
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "src/main/resources/webview"),
			publicPath: "./"
		},
		optimization: {
			minimize: true,
			minimizer: [
				new TerserPlugin({
					parallel: true,
					terserOptions: {
						ecma: 8,
						// Keep the class names otherwise @log won't provide a useful name
						keep_classnames: true,
						module: true,
						compress: {
							pure_funcs: ["console.warn"]
						}
					}
				})
			],
			splitChunks: {
				cacheGroups: {
					default: false,
					data: {
						chunks: "all",
						filename: "webview-data.js",
						test: /\.json/
					}
				}
			}
		},
		module: {
			rules: [
				{
					test: /\.html$/,
					use: "html-loader",
					exclude: /node_modules/
				},
				{
					test: /\.(js|ts)x?$/,
					use: {
						loader: "babel-loader",
						options: {
							plugins: ["babel-plugin-styled-components"]
						}
					},
					exclude: /node_modules/
				},
				{
					test: /\.less$/,
					use: [
						{
							loader: MiniCssExtractPlugin.loader
						},
						{
							loader: "css-loader",
							options: {
								sourceMap: !env.production,
								url: false
							}
						},
						{
							loader: "less-loader",
							options: {
								sourceMap: !env.production
							}
						}
					],
					exclude: /node_modules/
				}
			]
		},
		resolve: {
			extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
			// Dunno why this won't work
			// plugins: [
			// 	new TsconfigPathsPlugin({
			// 		configFile: path.resolve(context, "tsconfig.json"),
			// 		extensions: [".ts", ".tsx", ".js", ".jsx", ".less"]
			// 	})
			// ],
			alias: {
				"@codestream/protocols/agent": path.resolve(
					__dirname,
					"../shared/ui/protocols/agent/agent.protocol.ts"
				),
				"@codestream/protocols/api": path.resolve(
					__dirname,
					"../shared/ui/protocols/agent/api.protocol.ts"
				),
				"@codestream/protocols/webview": path.resolve(
					__dirname,
					"../shared/ui/ipc/webview.protocol.ts"
				),
				"@codestream/webview": path.resolve(__dirname, "../shared/ui/"),
				react: path.resolve(__dirname, "../shared/ui/node_modules/react"),
				"react-dom": path.resolve(__dirname, "../shared/ui/node_modules/react-dom"),
				"vscode-jsonrpc": path.resolve(__dirname, "../shared/ui/vscode-jsonrpc.shim.ts")
			},
			// Treats symlinks as real files -- using their "current" path
			symlinks: false
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

function createFolderSymlinkSync(source, target, env) {
	if (env.reset) {
		console.log("Unlinking symlink... (env.reset)");
		try {
			fs.unlinkSync(target);
		} catch (ex) {}
	} else if (fs.existsSync(target)) {
		return;
	}

	console.log("Creating symlink...", source, target);
	try {
		fs.symlinkSync(source, target, "dir");
	} catch (ex) {
		console.log(`Symlink creation failed; ${ex}`);
		try {
			fs.unlinkSync(target);
			fs.symlinkSync(source, target, "dir");
		} catch (ex) {
			console.log(`Symlink creation failed; ${ex}`);
			console.warn("Are you running this as an adminstrator?");
		}
	}
	console.log("\n");
}
