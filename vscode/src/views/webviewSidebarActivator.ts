"use strict";
import {
	commands,
	Disposable,
	Event,
	EventEmitter,
	TreeDataProvider,
	TreeItem,
	TreeView,
	window
} from "vscode";
import { Container } from "../container";

export class WebviewSidebarActivator implements TreeDataProvider<object>, Disposable {
	private _onDidChangeTreeData = new EventEmitter<object | undefined>();
	get onDidChangeTreeData(): Event<object | undefined> {
		return this._onDidChangeTreeData.event;
	}

	private readonly _disposable: Disposable;
	private readonly _tree: TreeView<object>;

	constructor() {
		this._tree = window.createTreeView("codestream", { treeDataProvider: this });
		this._disposable = Disposable.from(this._tree);
	}

	dispose() {
		this._disposable.dispose();
	}

	getTreeItem(node: object): TreeItem {
		return node;
	}

	getChildren(_node?: object): object[] {
		this.activate();
		return [];
	}

	private async activate() {
		await commands.executeCommand("workbench.action.toggleSidebarVisibility");
		Container.webview.toggle();

		// Ensure getChildren will get called again
		this._onDidChangeTreeData.fire(undefined);
	}
}
