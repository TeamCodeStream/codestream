import { build, BuildOptions } from "esbuild";
import * as path from "path";
import { copyPlugin } from "../shared/util/src/copyPlugin";
import { commonEsbuildOptions, processArgs } from "../shared/util/src/esbuildCommon";
import { createSymlinks } from "../shared/util/src/symlinks";

const context = path.resolve(__dirname, "webview");
const target = path.resolve(__dirname, "src/main/resources/webview");

const copy = copyPlugin({
	onEnd: [
		{
			from: path.resolve(context, "index.html"),
			to: target,
			options: { rename: "webview-template.html" }
		}
	]
});

(async function() {
	const args = processArgs();
	createSymlinks(__dirname, args);
	const buildOptions: BuildOptions = {
		...commonEsbuildOptions(true, args, [copy]),
		entryPoints: [
			path.resolve(context, "webview.ts"),
			path.resolve(context, "styles", "webview.less")
		],
		outdir: target
	};
	await build(buildOptions);
})();
