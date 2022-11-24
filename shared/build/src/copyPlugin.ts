import cpy, { Options } from "cpy";
import { Plugin, PluginBuild } from "esbuild";

export interface CopyStuff {
	from: string;
	to: string;
	options?: Options;
}

export interface CopyOptions {
	onStart?: CopyStuff[];
	onEnd?: CopyStuff[];
}

export const copyPlugin = (options: CopyOptions): Plugin => ({
	name: "copyPlugin",
	setup(build: PluginBuild) {
		const doCopy = async (stuff: CopyStuff[]) => {
			for (const entry of stuff) {
				await cpy(entry.from, entry.to, entry.options);
			}
		};

		build.onStart(async () => {
			if (options.onStart) {
				const start = Date.now();
				await doCopy(options.onStart);
				const elapsed = Date.now() - start;
				console.info(`copyPlugin onStart copied ${options.onStart.length} files in ${elapsed}ms`);
			}
		});

		build.onEnd(async () => {
			if (options.onEnd) {
				const start = Date.now();
				await doCopy(options.onEnd);
				const elapsed = Date.now() - start;
				console.info(`copyPlugin onEnd copied ${options.onEnd.length} files in ${elapsed}ms`);
			}
		});
	},
});
