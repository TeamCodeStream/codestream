import { BuildOptions } from "esbuild";
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
			// Visual Studio 2019
			from: path.join(agentDistTarget, "agent-vs-2019.js"),
			to: path.join(__dirname, "src/CodeStream.VisualStudio.Vsix.x86/agent"),
			options: { rename: "agent.js" },
		},
		{
			// Visual Studio 2019
			from: path.join(agentDistTarget, "agent-vs-2019.js.map"),
			to: path.join(__dirname, "/src/CodeStream.VisualStudio.Vsix.x86/agent"),
			options: { rename: "agent.js.map" },
		},
		{
			// Visual Studio 2022
			from: path.join(agentDistTarget, "agent.js"),
			to: path.join(__dirname, "src/CodeStream.VisualStudio.Vsix.x64/agent/agent.js"),
		},
		{
			// Visual Studio 2022
			from: path.join(agentDistTarget, "agent.js.map"),
			to: path.join(__dirname, "/src/CodeStream.VisualStudio.Vsix.x64/agent/agent.js.map"),
		},
		{
			from: path.join(agentDistTarget, "node_modules/**"),
			to: path.resolve(
				__dirname,
				"src/resources/agent/node_modules/"
			),
		},
		{
			from: path.resolve(__dirname, "../shared/webviews/newrelic-browser.js"),
			to: path.join(__dirname, "src/resources/webview/newrelic-browser.js"),
		},
		{
			from: path.join(context, "index.html"),
			to: target,
			options: { rename: "webview.html" },
		},
		{
			from: path.resolve(target, "index.js.map"),
			to: path.join(agentDistTarget, "index.js.map"),
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
