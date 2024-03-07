import * as esbuild from "esbuild";
import * as path from "path";
import { Args, commonEsbuildOptions, processArgs, startEsbuild } from "../shared/build/src/esbuildCommon";
import { removeSymlinks } from "../shared/build/src/symlinks";

function makeBuildOptions(args: Args, webviewName: string, target: string) {
	const sourceDirectory = path.resolve(__dirname, `src/resources/webviews/${webviewName}`);

	const buildOptions: esbuild.BuildOptions = {
		...commonEsbuildOptions(true, args, []),
		entryPoints: [
			path.resolve(sourceDirectory, `${webviewName}.ts`),
			path.resolve(sourceDirectory, "styles", `${webviewName}.less`)
		],
		outdir: path.join(sourceDirectory, "dist"),
		target: target, 
	};

	return buildOptions;
}

(async function () {
	const args = processArgs();
	removeSymlinks(__dirname);

	const sideBarOptions = makeBuildOptions(args, "sidebar", "chrome69");
	const editorOptions = makeBuildOptions(args, "editor", "chrome90");

	await startEsbuild(args, sideBarOptions);
	await startEsbuild(args, editorOptions);
})();
