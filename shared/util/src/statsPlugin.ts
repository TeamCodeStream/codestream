import { PluginBuild } from "esbuild";

export const statsPlugin = {
	name: "stats",
	setup(build: PluginBuild) {
		let count = 0;
		let total = 0;
		let since = Date.now();
		let start = 0;

		build.onStart(() => {
			start = Date.now();
		});

		build.onEnd(result => {
			const elapsed = Date.now() - start;
			count++;
			total += elapsed;
			const sinceStr = new Date(since).toLocaleString();
			console.info(
				`⌛ compileTime: ${elapsed}ms, compileCount: ${count}, totalCompileTime: ${total}, since: ${sinceStr}`
			);
		});
	}
};
