import { BuildOptions, Plugin } from "esbuild";
import { statsPlugin } from "./statsPlugin";
import { vscShimPlugin } from "./vscShim";
import { lessLoader } from "esbuild-plugin-less";
import * as path from "path";

export type Mode = "production" | "development";

export type IdeType = "vs" | "vscode" | "jb";

export interface Args {
	watchMode: boolean;
	reset: boolean;
	mode: Mode;
	ide?: IdeType;
}

export function processArgs(): Args {
	const watchMode = process.argv.findIndex((arg) => arg === "--watch") !== -1;
	const reset = process.argv.findIndex((arg) => arg === "--reset") !== -1;
	const mode =
		process.argv.findIndex((arg) => arg === "--prod") !== -1 ? "production" : "development";
	const ideIndex = process.argv.findIndex((arg) => arg === "--ide");
	const ide =
		ideIndex !== -1 && process.argv.length >= ideIndex + 1
			? (process.argv[ideIndex + 1] as IdeType)
			: undefined;
	const args: Args = {
		watchMode,
		reset,
		mode,
		ide,
	};
	console.info(JSON.stringify(args));
	return args;
}

export function commonEsbuildOptions(
	isWeb: boolean,
	args: Args,
	extraPlugins: Plugin[] = []
): BuildOptions {
	const plugins = isWeb ? [lessLoader(), vscShimPlugin, statsPlugin, ...extraPlugins] : undefined;

	return {
		bundle: true,
		define: { "process.env.NODE_ENV": '"production"' },
		loader: isWeb ? { ".js": "jsx" } : undefined,
		inject: isWeb ? [path.resolve(__dirname, "../../ui/vscode-jsonrpc.shim.ts")] : undefined,
		minify: args.mode === "production",
		// To support @log
		keepNames: true,
		plugins,
		sourcemap: "linked",
		watch: args.watchMode,
	};
}
