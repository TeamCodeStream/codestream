import * as esbuild from "esbuild";
import * as path from "path";
import { copyPlugin } from "../shared/build/src/copyPlugin";
import { Args, commonEsbuildOptions, processArgs, startEsbuild } from "../shared/build/src/esbuildCommon";
import { removeSymlinks } from "../shared/build/src/symlinks";

function makeBuildOptions(args: Args, context: string, target: string, copy: esbuild.Plugin) {
	const buildOptions: esbuild.BuildOptions = {
		...commonEsbuildOptions(true, args, [copy]),
		entryPoints: [
			path.resolve(context, "index.ts"),
			path.resolve(context, "styles", "webview.less")
		],
		outdir: target,
		target: "chrome90", // jxbrowser compatability
	};
	return buildOptions;
}

async function webBuildSidebar(args: Args) {
	const context = path.resolve(__dirname, "webviews/sidebar");
	const target = path.resolve(__dirname, "src/main/resources/webviews/sidebar");
	const agentTarget = path.resolve(__dirname, "src/main/resources/agent");
	const agentDistTarget = path.resolve(__dirname, "../shared/agent/dist");
	const copy = copyPlugin({
		onEnd: [
			{
				from: path.resolve(context, "index.html"),
				to: target,
				options: { rename: "webview-template.html" },
			},
			{
				from: path.resolve(target, "index.js.map"),
				to: `${agentTarget}/index.js.map`,
			},
			{
				from: path.resolve(target, "index.js.map"),
				to: `${agentDistTarget}/index.js.map`,
			}
		]
	});
	const buildOptions = makeBuildOptions(args, context, target, copy);
	await startEsbuild(args, buildOptions);
}

async function webBuildEditor(args: Args) {
	const context = path.resolve(__dirname, "webviews/editor");
	const target = path.resolve(__dirname, "src/main/resources/webviews/editor");
	const copy = copyPlugin({
		onEnd: [
			{
				from: path.resolve(context, "index.html"),
				to: target,
				options: { rename: "webview-template.html" },
			}
		]
	});
	const buildOptions = makeBuildOptions(args, context, target, copy);
	await startEsbuild(args, buildOptions);
}

(async function() {
	const args = processArgs();
	removeSymlinks(__dirname);

	console.info("Starting Primary Webview Build...");
	await webBuildSidebar({ ...args });

	console.info("Starting Secondary Webview Build...");
	await webBuildEditor({ ...args });
})();
