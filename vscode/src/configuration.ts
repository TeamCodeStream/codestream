"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/configuration.ts which carries this notice:

The MIT License (MIT)

Copyright (c) 2016-2021 Eric Amodio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Modifications Copyright CodeStream Inc. under the Apache 2.0 License (Apache-2.0)
 */
export * from "./config";

import {
	ConfigurationChangeEvent,
	ConfigurationTarget,
	Event,
	EventEmitter,
	ExtensionContext,
	Uri,
	workspace
} from "vscode";
import { Config } from "./config";
import { extensionId } from "./constants";
import { Functions } from "./system";

const emptyConfig: any = new Proxy<any>({} as Config, {
	get() {
		return emptyConfig;
	}
});

export interface ConfigurationWillChangeEvent {
	change: ConfigurationChangeEvent;
	transform?(e: ConfigurationChangeEvent): ConfigurationChangeEvent;
}

export class Configuration {
	static configure(context: ExtensionContext) {
		context.subscriptions.push(
			workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration)
		);
	}

	private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();
	get onDidChange(): Event<ConfigurationChangeEvent> {
		return this._onDidChange.event;
	}

	private _onDidChangeAny = new EventEmitter<ConfigurationChangeEvent>();
	get onDidChangeAny(): Event<ConfigurationChangeEvent> {
		return this._onDidChangeAny.event;
	}

	private _onWillChange = new EventEmitter<ConfigurationWillChangeEvent>();
	get onWillChange(): Event<ConfigurationWillChangeEvent> {
		return this._onWillChange.event;
	}

	private onConfigurationChanged(e: ConfigurationChangeEvent) {
		if (!e.affectsConfiguration(extensionId, null!)) {
			this._onDidChangeAny.fire(e);

			return;
		}

		const evt: ConfigurationWillChangeEvent = {
			change: e
		};
		this._onWillChange.fire(evt);

		if (evt.transform !== undefined) {
			e = evt.transform(e);
		}

		this._onDidChange.fire(e);
	}

	readonly initializingChangeEvent: ConfigurationChangeEvent = {
		affectsConfiguration: (_section: string, _resource?: Uri) => true
	};

	get<T>(section?: string, resource?: Uri | null, defaultValue?: T) {
		return defaultValue === undefined
			? workspace
					.getConfiguration(section === undefined ? undefined : extensionId, resource!)
					.get<T>(section === undefined ? extensionId : section)!
			: workspace
					.getConfiguration(section === undefined ? undefined : extensionId, resource!)
					.get<T>(section === undefined ? extensionId : section, defaultValue)!;
	}

	getAny<T>(section: string, resource?: Uri | null, defaultValue?: T) {
		return defaultValue === undefined
			? workspace.getConfiguration(undefined, resource!).get<T>(section)!
			: workspace.getConfiguration(undefined, resource!).get<T>(section, defaultValue)!;
	}

	changed(e: ConfigurationChangeEvent, section: string, resource?: Uri | null) {
		return e.affectsConfiguration(`${extensionId}.${section}`, resource!);
	}

	initializing(e: ConfigurationChangeEvent) {
		return e === this.initializingChangeEvent;
	}

	inspect(section?: string, resource?: Uri | null) {
		return workspace
			.getConfiguration(section === undefined ? undefined : extensionId, resource!)
			.inspect(section === undefined ? extensionId : section);
	}

	async migrate<TFrom, TTo>(
		from: string,
		to: string,
		options: { fallbackValue?: TTo; migrationFn?(value: TFrom): TTo } = {}
	): Promise<boolean> {
		const inspection = configuration.inspect(from);
		if (inspection === undefined) return false;

		let migrated = false;
		if (inspection.globalValue !== undefined) {
			await this.update(
				to,
				options.migrationFn
					? options.migrationFn(inspection.globalValue as TFrom)
					: inspection.globalValue,
				ConfigurationTarget.Global
			);
			migrated = true;
			// Can't delete the old setting currently because it errors with `Unable to write to User Settings because <setting name> is not a registered configuration`
			// if (from !== to) {
			//     try {
			//         await this.update(from, undefined, ConfigurationTarget.Global);
			//     }
			//     catch { }
			// }
		}

		if (inspection.workspaceValue !== undefined) {
			await this.update(
				to,
				options.migrationFn
					? options.migrationFn(inspection.workspaceValue as TFrom)
					: inspection.workspaceValue,
				ConfigurationTarget.Workspace
			);
			migrated = true;
			// Can't delete the old setting currently because it errors with `Unable to write to User Settings because <setting name> is not a registered configuration`
			// if (from !== to) {
			//     try {
			//         await this.update(from, undefined, ConfigurationTarget.Workspace);
			//     }
			//     catch { }
			// }
		}

		if (inspection.workspaceFolderValue !== undefined) {
			await this.update(
				to,
				options.migrationFn
					? options.migrationFn(inspection.workspaceFolderValue as TFrom)
					: inspection.workspaceFolderValue,
				ConfigurationTarget.WorkspaceFolder
			);
			migrated = true;
			// Can't delete the old setting currently because it errors with `Unable to write to User Settings because <setting name> is not a registered configuration`
			// if (from !== to) {
			//     try {
			//         await this.update(from, undefined, ConfigurationTarget.WorkspaceFolder);
			//     }
			//     catch { }
			// }
		}

		if (!migrated && options.fallbackValue !== undefined) {
			await this.update(to, options.fallbackValue, ConfigurationTarget.Global);
			migrated = true;
		}

		return migrated;
	}

	async migrateIfMissing<TFrom, TTo>(
		from: string,
		to: string,
		options: { migrationFn?(value: TFrom): TTo } = {}
	) {
		const fromInspection = configuration.inspect(from);
		if (fromInspection === undefined) return;

		const toInspection = configuration.inspect(to);
		if (fromInspection.globalValue !== undefined) {
			if (toInspection === undefined || toInspection.globalValue === undefined) {
				await this.update(
					to,
					options.migrationFn
						? options.migrationFn(fromInspection.globalValue as TFrom)
						: fromInspection.globalValue,
					ConfigurationTarget.Global
				);
				// Can't delete the old setting currently because it errors with `Unable to write to User Settings because <setting name> is not a registered configuration`
				// if (from !== to) {
				//     try {
				//         await this.update(from, undefined, ConfigurationTarget.Global);
				//     }
				//     catch { }
				// }
			}
		}

		if (fromInspection.workspaceValue !== undefined) {
			if (toInspection === undefined || toInspection.workspaceValue === undefined) {
				await this.update(
					to,
					options.migrationFn
						? options.migrationFn(fromInspection.workspaceValue as TFrom)
						: fromInspection.workspaceValue,
					ConfigurationTarget.Workspace
				);
				// Can't delete the old setting currently because it errors with `Unable to write to User Settings because <setting name> is not a registered configuration`
				// if (from !== to) {
				//     try {
				//         await this.update(from, undefined, ConfigurationTarget.Workspace);
				//     }
				//     catch { }
				// }
			}
		}

		if (fromInspection.workspaceFolderValue !== undefined) {
			if (toInspection === undefined || toInspection.workspaceFolderValue === undefined) {
				await this.update(
					to,
					options.migrationFn
						? options.migrationFn(fromInspection.workspaceFolderValue as TFrom)
						: fromInspection.workspaceFolderValue,
					ConfigurationTarget.WorkspaceFolder
				);
				// Can't delete the old setting currently because it errors with `Unable to write to User Settings because <setting name> is not a registered configuration`
				// if (from !== to) {
				//     try {
				//         await this.update(from, undefined, ConfigurationTarget.WorkspaceFolder);
				//     }
				//     catch { }
				// }
			}
		}
	}

	name<K extends keyof Config>(name: K) {
		return Functions.propOf(emptyConfig as Config, name);
	}

	update(section: string, value: any, target: ConfigurationTarget, resource?: Uri | null) {
		return workspace
			.getConfiguration(extensionId, target === ConfigurationTarget.Global ? undefined : resource!)
			.update(section, value, target);
	}

	updateAny(section: string, value: any, target: ConfigurationTarget, resource?: Uri | null) {
		return workspace
			.getConfiguration(undefined, target === ConfigurationTarget.Global ? undefined : resource!)
			.update(section, value, target);
	}

	async updateEffective(section: string, value: any, resource: Uri | null = null) {
		const inspect = await configuration.inspect(section, resource)!;
		if (inspect.workspaceFolderValue !== undefined) {
			if (value === inspect.workspaceFolderValue) return;

			return await configuration.update(
				section,
				value,
				ConfigurationTarget.WorkspaceFolder,
				resource
			);
		}

		if (inspect.workspaceValue !== undefined) {
			if (value === inspect.workspaceValue) return;

			return await configuration.update(section, value, ConfigurationTarget.Workspace);
		}

		if (
			inspect.globalValue === value ||
			(inspect.globalValue === undefined && value === inspect.defaultValue)
		) {
			return;
		}

		return await configuration.update(
			section,
			value === inspect.defaultValue ? undefined : value,
			ConfigurationTarget.Global
		);
	}
}

export const configuration = new Configuration();
