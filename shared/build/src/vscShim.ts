import { PluginBuild } from "esbuild";
import * as path from "path";

const shimTarget = path.resolve(__dirname, "../../ui/vscode-jsonrpc.shim.ts");

export const vscShimPlugin = {
	name: "shimmy",
	setup(build: PluginBuild) {
		// Redirect all paths starting with "images/" to "./public/images/"
		build.onResolve({ filter: /^vscode-jsonrpc$/ }, args => {
			return { path: shimTarget };
		});
	}
};
