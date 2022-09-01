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
        // VS Code
		from: `${outputDir}/agent.*`,
		to: path.resolve(__dirname, "../../vscode/dist/")
	},
    {
        // Visual Studio 2019
		from: `${outputDir}/agent-vs-2019.js`,
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio.Vsix.x86/agent"),
		options: { rename: "agent.js" }
	},
	{
        // Visual Studio 2019
		from: `${outputDir}/agent-vs-2019.js.map`,
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio.Vsix.x86/agent"),
		options: { rename: "agent.js.map" }
	},
	{
        // Visual Studio 2022
		from: `${outputDir}/agent.*`,
		to: path.resolve(__dirname, "../../vs/src/CodeStream.VisualStudio.Vsix.x64/agent/")
	}
];

(async function() {
	const args = processArgs();
	const buildOption: BuildOptions = {
		...commonEsbuildOptions(false, args),
		entryPoints: {
			agent: "./src/main.ts",
			"agent-vs-2019": "./src/main-vs-2019.ts"
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
		outdir: outputDir,
		sourceRoot: path.resolve(__dirname, "../../agent/dist"),
		sourcesContent: false
	};

	await build(buildOption);
})();
