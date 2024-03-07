import * as esbuild from "esbuild";
import * as path from "path";
import { copyPlugin } from "../shared/build/src/copyPlugin";
import { Args, commonEsbuildOptions, processArgs, startEsbuild } from "../shared/build/src/esbuildCommon";
import { removeSymlinks } from "../shared/build/src/symlinks";

function makeBuildOptions(args: Args, context: string, target: string, copy: esbuild.Plugin, webviewName: string) {
	const buildOptions: esbuild.BuildOptions = {
		...commonEsbuildOptions(true, args, [copy]),
		entryPoints: [
			path.resolve(context, `${webviewName}.ts`),
			path.resolve(context, "styles", `${webviewName}.less`)
		],
		outdir: target,
		target: "chrome90", // jxbrowser compatability
	};
	return buildOptions;
}

async function webBuildSidebar(args: Args, webviewName: string) {
	const context = path.resolve(__dirname, "webviews", webviewName);
	const target = path.resolve(__dirname, "src/main/resources/webviews", webviewName);

	const agentTarget = path.resolve(__dirname, "src/main/resources/agent");
	const agentDistTarget = path.resolve(__dirname, "../shared/agent/dist");

	const copy = copyPlugin({
		onEnd: [
			{
				from: path.resolve(context, `${webviewName}.html`),
				to: target,
				options: { rename: "webview-template.html" },
			},
			{
				from: path.resolve(target, `${webviewName}.js.map`),
				to: `${agentTarget}/${webviewName}.js.map`,
			},
			{
				from: path.resolve(target, `${webviewName}.js.map`),
				to: `${agentDistTarget}/${webviewName}.js.map`,
			}
		]
	});
	const buildOptions = makeBuildOptions(args, context, target, copy, webviewName);
	await startEsbuild(args, buildOptions);
}

async function webBuildEditor(args: Args, webviewName: string) {
	const context = path.resolve(__dirname, "webviews", webviewName);
	const target = path.resolve(__dirname, "src/main/resources/webviews", webviewName);

	const copy = copyPlugin({
		onEnd: [
			{
				from: path.resolve(context, `${webviewName}.html`),
				to: target,
				options: { rename: "webview-template.html" },
			}
		]
	});
	const buildOptions = makeBuildOptions(args, context, target, copy, webviewName);
	await startEsbuild(args, buildOptions);
}

(async function() {
	const args = processArgs();
	removeSymlinks(__dirname);

	console.info("Starting Primary Webview Build...");
	await webBuildSidebar({ ...args }, "sidebar");

	console.info("Starting Secondary Webview Build...");
	await webBuildEditor({ ...args }, "editor");
})();
