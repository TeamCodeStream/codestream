import * as path from "path";

import graphqlLoaderPlugin from "@luckycatfactory/esbuild-graphql-loader";
import { BuildOptions } from "esbuild";
import ignorePlugin from "esbuild-plugin-ignore";

import { copyPlugin, CopyStuff } from "../build/src/copyPlugin";
import { commonEsbuildOptions, processArgs, startEsbuild } from "../build/src/esbuildCommon";
import { nativeNodeModulesPlugin } from "../build/src/nativeNodeModulesPlugin";
import { statsPlugin } from "../build/src/statsPlugin";

// Latest newrelic agent doesn't support bundling with esbuild due to use of require-in-the-middle, so we are
// making newrelic and all its deps external. Note that each new release of newrelic may require us to add or
// remove modules from this list (ノಠ益ಠ)ノ彡┻━┻.
// The current list was done by hand as to not include any modules that aren't actually used.
// undici is external because the newrelic agent can instrument it if it isn't bundled.
// fsevents is external because it has a native module
const externals = [
	"fsevents",
	"undici",
	"sync-rpc",
	"sync-request",
	"newrelic",
	"import-in-the-middle",
	"require-in-the-middle",
	"semver",
	"json-stringify-safe",
	"readable-stream",
	"inherits",
	"util-deprecate",
	"resolve",
	"is-core-module",
	"has",
	"concat-stream",
	"function-bind",
	"debug",
	"buffer-from",
	"module-details-from-path",
	"json-bigint",
	"@fastify/busboy",
	"bignumber.js",
];
const outputDir = path.resolve(__dirname, "dist");

const ignore = ignorePlugin([
	{
		resourceRegExp: /vm2$/,
	},
]);

const postBuildCopy: CopyStuff[] = [
	{
		from: "node_modules/opn/**/xdg-open",
		to: outputDir,
	},
	{
		// VS Code
		from: `${outputDir}/agent.*`,
		to: path.resolve(__dirname, "../../vscode/dist/"),
	},
	{
		// Visual Studio 2019
		from: `${outputDir}/agent-vs-2019.js`,
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio.Vsix.x86/agent"),
		options: { rename: "agent.js" },
	},
	{
		// Visual Studio 2019
		from: `${outputDir}/agent-vs-2019.js.map`,
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio.Vsix.x86/agent"),
		options: { rename: "agent.js.map" },
	},
	{
		// Visual Studio 2022
		from: `${outputDir}/agent.*`,
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio.Vsix.x64/agent/"),
	},
	...externals.map(e => ({
		from: path.resolve(__dirname, `node_modules/${e}/**`),
		to: path.resolve(`${outputDir}/node_modules/${e}`),
	})),
	{
		from: path.resolve(`${outputDir}/node_modules/**`),
		to: path.resolve(__dirname, "../../vscode/dist/node_modules/"),
	},
	{
		from: path.resolve(`${outputDir}/node_modules/**`),
		to: path.resolve(
			__dirname,
			"../../vs/src/CodeStream.VisualStudio.Vsix.x86/agent/node_modules/"
		),
	},
	{
		from: path.resolve(`${outputDir}/node_modules/**`),
		to: path.resolve(
			__dirname,
			"../../vs/src/CodeStream.VisualStudio.Vsix.x64/agent/node_modules/"
		),
	},
];

(async function () {
	const args = processArgs();
	const buildOptions: BuildOptions = {
		...commonEsbuildOptions(false, args),
		entryPoints: {
			agent: "./src/main.ts",
			"agent-vs-2019": "./src/main-vs-2019.ts",
		},
		external: externals,
		plugins: [
			graphqlLoaderPlugin(),
			nativeNodeModulesPlugin,
			statsPlugin,
			ignore,
			copyPlugin({ onEnd: postBuildCopy }),
		],
		format: "cjs",
		platform: "node",
		target: "node16.17",
		outdir: outputDir,
		sourceRoot: args.ide === "vs" ? path.resolve(__dirname, "../agent/dist") : undefined,
		sourcesContent: args.mode === "development" && args.ide !== "vs",
	};

	await startEsbuild(args, buildOptions);
})();
