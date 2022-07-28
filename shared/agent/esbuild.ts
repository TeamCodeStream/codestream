import graphqlLoaderPlugin from "@luckycatfactory/esbuild-graphql-loader";
import { build, BuildOptions } from "esbuild";
import ignorePlugin from "esbuild-plugin-ignore";
import * as path from "path";
import { copyPlugin, CopyStuff } from "../util/src/copyPlugin";
import { commonEsbuildOptions, processArgs } from "../util/src/esbuildCommon";
import { nativeNodeModulesPlugin } from "../util/src/nativeNodeModulesPlugin";
import { statsPlugin } from "../util/src/statsPlugin";

const outputDir = path.resolve(__dirname, "dist");

const ignore = ignorePlugin([
	{
		resourceRegExp: /vm2$/
	}
]);

const postBuildCopy: CopyStuff[] = [
	{
		from: "node_modules/opn/**/xdg-open",
		to: outputDir
	},
	{
		from: `${outputDir}/agent.*`,
		// TODO: Use environment variable if exists
		to: path.resolve(__dirname, "../../vscode/dist/")
	},
	{
		from: `${outputDir}/agent-pkg.js`,
		// TODO: Use environment variable if exists
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio/dist"),
		options: { rename: "agent.js" }
	},
	{
		from: `${outputDir}/agent-pkg.js.map`,
		// TODO: Use environment variable if exists
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio/dist"),
		options: { rename: "agent-pkg.js.map" }
	},
	{
		from: `${outputDir}/agent-pkg.js`,
		// TODO: Use environment variable if exists
		to: path.resolve(__dirname, "../../jb/src/main/resources/agent")
	},
	{
		from: `${outputDir}/agent-pkg.js.map`,
		// TODO: Use environment variable if exists
		to: path.resolve(__dirname, "../../jb/src/main/resources/agent")
	}
];

(async function() {
	const args = processArgs();
	const buildOption: BuildOptions = {
		...commonEsbuildOptions(false, args),
		entryPoints: {
			agent: "./src/main.ts",
			"agent-pkg": "./src/main-vs.ts"
		},
		plugins: [
			graphqlLoaderPlugin(),
			nativeNodeModulesPlugin,
			statsPlugin,
			ignore,
			copyPlugin({ onEnd: postBuildCopy })
		],
		format: "cjs",
		platform: "node",
		target: "node16.13",
		outdir: outputDir
	};

	await build(buildOption);
})();
