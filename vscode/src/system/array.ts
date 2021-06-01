"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/system/array.ts which carries this notice:

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

Copyright (c) 2018-2021 CodeStream Inc.

*/

import { Objects } from "./object";

export namespace Arrays {
	export function count<T>(source: T[], predicate: (item: T) => boolean): number {
		return source.reduce((count, item) => (predicate(item) ? count + 1 : count), 0);
	}

	export function countUniques<T>(
		source: T[],
		accessor: (item: T) => string
	): { [key: string]: number } {
		const uniqueCounts = Object.create(null);
		for (const item of source) {
			const value = accessor(item);
			uniqueCounts[value] = (uniqueCounts[value] || 0) + 1;
		}
		return uniqueCounts;
	}

	export function filterMap<T, TMapped>(
		source: T[],
		predicateMapper: (item: T) => TMapped | null | undefined
	): TMapped[] {
		return source.reduce((accumulator, current) => {
			const mapped = predicateMapper(current);
			if (mapped != null) {
				accumulator.push(mapped);
			}
			return accumulator;
		}, [] as TMapped[]);
	}

	export async function filterMapAsync<T, TMapped>(
		source: T[],
		predicateMapper: (item: T) => Promise<TMapped | null | undefined>
	): Promise<TMapped[]> {
		return source.reduce(async (accumulator, current) => {
			const mapped = await predicateMapper(current);
			if (mapped != null) {
				accumulator.push(mapped);
			}
			return accumulator;
		}, [] as any);
	}

	export function groupBy<T>(source: T[], accessor: (item: T) => string): { [key: string]: T[] } {
		return source.reduce((groupings, current) => {
			const value = accessor(current);
			groupings[value] = groupings[value] || [];
			groupings[value].push(current);
			return groupings;
		}, Object.create(null));
	}

	export interface IHierarchicalItem<T> {
		name: string;
		relativePath: string;
		value?: T;

		// parent?: IHierarchicalItem<T>;
		children: { [key: string]: IHierarchicalItem<T> } | undefined;
		descendants: T[] | undefined;
	}

	export function makeHierarchical<T>(
		values: T[],
		splitPath: (i: T) => string[],
		joinPath: (...paths: string[]) => string,
		compact: boolean = false
	): IHierarchicalItem<T> {
		const seed = {
			name: "",
			relativePath: "",
			children: Object.create(null),
			descendants: []
		};

		const hierarchy = values.reduce((root: IHierarchicalItem<T>, value) => {
			let folder = root;

			let relativePath = "";
			for (const folderName of splitPath(value)) {
				relativePath = joinPath(relativePath, folderName);

				if (folder.children === undefined) {
					folder.children = Object.create(null);
				}

				let f = folder.children![folderName];
				if (f === undefined) {
					folder.children![folderName] = f = {
						name: folderName,
						relativePath: relativePath,
						// parent: folder,
						children: undefined,
						descendants: undefined
					};
				}

				if (folder.descendants === undefined) {
					folder.descendants = [];
				}
				folder.descendants.push(value);
				folder = f;
			}

			folder.value = value;

			return root;
		}, seed);

		if (compact) return compactHierarchy(hierarchy, joinPath, true);
		return hierarchy;
	}

	export function compactHierarchy<T>(
		root: IHierarchicalItem<T>,
		joinPath: (...paths: string[]) => string,
		isRoot: boolean = true
	): IHierarchicalItem<T> {
		if (root.children === undefined) return root;

		const children = [...Objects.values(root.children)];

		// // Attempts less nesting but duplicate roots
		// if (!isRoot && children.every(c => c.value === undefined)) {
		//     const parentSiblings = root.parent!.children!;
		//     if (parentSiblings[root.name] !== undefined) {
		//         delete parentSiblings[root.name];

		//         for (const child of children) {
		//             child.name = joinPath(root.name, child.name);
		//             parentSiblings[child.name] = child;
		//         }
		//     }
		// }

		for (const child of children) {
			compactHierarchy(child, joinPath, false);
		}

		if (!isRoot && children.length === 1) {
			const child = children[0];
			if (child.value === undefined) {
				root.name = joinPath(root.name, child.name);
				root.relativePath = child.relativePath;
				root.children = child.children;
			}
		}

		return root;
	}

	export function uniqueBy<T>(
		source: T[],
		accessor: (item: T) => any,
		predicate?: (item: T) => boolean
	): T[] {
		const uniqueValues = Object.create(null);
		return source.filter(item => {
			const value = accessor(item);
			if (uniqueValues[value]) return false;

			uniqueValues[value] = accessor;
			return predicate ? predicate(item) : true;
		});
	}
}
