import * as esbuild from "esbuild";
import * as path from "path";
import { Args, commonEsbuildOptions, processArgs, startEsbuild } from "../shared/build/src/esbuildCommon";
import { removeSymlinks } from "../shared/build/src/symlinks";

const sourceDirectory = path.resolve(__dirname, `src/CodeStream.VisualStudio.Vsix.x64/webviews/`);
const targetDirectory = path.resolve(__dirname, `src/CodeStream.VisualStudio.Vsix.x64/dist/webviews/`)

function makeBuildOptions(args: Args, webviewName: string, target: string){
	const buildOptions: esbuild.BuildOptions = {
		...commonEsbuildOptions(true, args, []),
		entryPoints: [
			path.resolve(sourceDirectory, `${webviewName}.ts`),
			path.resolve(sourceDirectory, `${webviewName}.less`)
		],
		outdir: targetDirectory,
		target: target, 
	};

	return buildOptions;
}

async function buildSidebar(args: Args){
	const buildOptions = makeBuildOptions(args, "sidebar", "chrome69")

	await startEsbuild(args, buildOptions)
}

async function buildEditor(args: Args){
	const buildOptions = makeBuildOptions(args, "editor", "chrome90")
	
	await startEsbuild(args, buildOptions);
}

(async function () {
	const args = processArgs();
	removeSymlinks(__dirname);

	await buildSidebar(args);
	await buildEditor(args);	
})();
