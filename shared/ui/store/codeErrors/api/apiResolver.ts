import { CodeErrorsApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsApi";
import { CodeErrorsIDEApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsIDEApi";
import { codeErrorsIDEApiImpl } from "@codestream/webview/store/codeErrors/api/CodeErrorsIDEApiImpl";
import { codeErrorsApiDemo } from "@codestream/webview/store/codeErrors/api/CodeErrorsApiDemo";
import { codeErrorsIDEApiDemo } from "@codestream/webview/store/codeErrors/api/CodeErrorsIDEApiDemo";
import { codeErrorsApiImpl } from "@codestream/webview/store/codeErrors/api/CodeErrorsApiImpl";

export let codeErrorsApi: CodeErrorsApi = codeErrorsApiImpl;
export let codeErrorsIDEApi: CodeErrorsIDEApi = codeErrorsIDEApiImpl;

export function setApiDemoMode(demoMode: boolean) {
	if (demoMode) {
		codeErrorsApi = codeErrorsApiDemo;
		codeErrorsIDEApi = codeErrorsIDEApiDemo;
	} else {
		codeErrorsApi = codeErrorsApiImpl;
		codeErrorsIDEApi = codeErrorsIDEApiImpl;
	}
}

export function setApiCurrentRepoId(repoId: string) {
	codeErrorsApiDemo.setCurrentRepoId(repoId);
	codeErrorsApiImpl.setCurrentRepoId(repoId);
	codeErrorsIDEApiDemo.setCurrentRepoId(repoId);
	codeErrorsIDEApiImpl.setCurrentRepoId(repoId);
}

export function setApiCurrentEntityId(entityId: string) {
	codeErrorsApiImpl.setCurrentEntityId(entityId);
	codeErrorsApiDemo.setCurrentEntityId(entityId);
}

export function setApiNrAiUserId(userId: string) {
	codeErrorsApiImpl.setNrAiUserId(userId);
	codeErrorsIDEApiImpl.setNrAiUserId(userId);
	codeErrorsApiDemo.setNrAiUserId(userId);
	codeErrorsIDEApiDemo.setNrAiUserId(userId);
}

export function setApiUserId(userId: string) {
	codeErrorsIDEApiImpl.setUserId(userId);
	codeErrorsIDEApiDemo.setUserId(userId);
}

export function setApplyFixCallback(callback: () => void) {
	codeErrorsIDEApiDemo.setApplyFixCallback(callback);
}

export function setPostReplyCallback(callback: (text: string) => void) {
	codeErrorsIDEApiDemo.setPostReplyCallback(callback);
}
