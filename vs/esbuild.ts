import {  BuildOptions } from "esbuild";
import * as path from "path";
import { copyPlugin } from "../shared/build/src/copyPlugin";
import { commonEsbuildOptions, processArgs, startEsbuild } from "../shared/build/src/esbuildCommon";
import { removeSymlinks } from "../shared/build/src/symlinks";

const context = path.resolve(__dirname, "src/CodeStream.VisualStudio.Shared/UI/WebViews");
const target = path.resolve(__dirname, "src/resources/webview");
const agentDistTarget = path.resolve(__dirname, "../shared/agent/dist");

const copy = copyPlugin({
	onEnd: [
		{
			from: path.resolve(__dirname, "../shared/ui/newrelic-browser.js"),
			to: path.resolve(__dirname, "src/resources/webview"),
		},
		{
			from: path.resolve(context, "index.html"),
			to: target,
			options: { rename: "webview.html" },
		},
		{
			from: path.resolve(target, "index.js.map"),
			to: agentDistTarget,
		},
	]
});

(async function () {
	const args = processArgs();
	removeSymlinks(__dirname);
	const buildOptions: BuildOptions = {
		...commonEsbuildOptions(true, args, [copy]),
		entryPoints: [
			path.resolve(context, "index.ts"),
			path.resolve(context, "styles", "webview.less")
		],
		outdir: target,
		target: "chrome69"
	};
	await startEsbuild(args, buildOptions);
})();
