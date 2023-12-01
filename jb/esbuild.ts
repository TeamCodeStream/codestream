import * as esbuild from "esbuild";
import * as path from "path";
import { copyPlugin } from "../shared/build/src/copyPlugin";
import { commonEsbuildOptions, processArgs, startEsbuild } from "../shared/build/src/esbuildCommon";
import { removeSymlinks } from "../shared/build/src/symlinks";

const context = path.resolve(__dirname, "webview");
const target = path.resolve(__dirname, "src/main/resources/webview");
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

(async function() {
	const args = processArgs();
	removeSymlinks(__dirname);
	const buildOptions: esbuild.BuildOptions = {
		...commonEsbuildOptions(true, args, [copy]),
		entryPoints: [
			path.resolve(context, "index.ts"),
			path.resolve(context, "styles", "webview.less")
		],
		outdir: target,
		target: "chrome90", // jxbrowser compatability
	};
	await startEsbuild(args, buildOptions);
})();
