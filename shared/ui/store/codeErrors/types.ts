import { CSCodeError } from "@codestream/protocols/api";
import { Index } from "@codestream/utils/types";
import { CSAsyncError, NewRelicErrorGroup } from "@codestream/protocols/agent";

export enum CodeErrorsActionsTypes {
	AddCodeErrors = "ADD_CODEERRORS",
	SaveCodeErrors = "@codeErrors/SaveCodeErrors",
	SetFunctionToEdit = "@codeErrors/SetFunctionToEdit",
	SetFunctionToEditFailed = "@codeErrors/SetFunctionToEditFailed",
	SetGrokError = "@codeErrors/SetGrokError",
	SetGrokLoading = "@codeErrors/SetGrokLoading",
	SetGrokRepliesLength = "@codeErrors/SetGrokRepliesLength",
	UpdateCodeErrors = "@codeErrors/UpdateCodeErrors",
	Delete = "@codeErrors/Delete",
	Bootstrap = "@codeErrors/Bootstrap",
	HandleDirectives = "@codeErrors/HandleDirectives",
	AddProviderError = "@codeErrors/AddError",
	ClearProviderError = "@codeErrors/ClearError",
	SetErrorGroup = "@codeError/SetErrorGroup",
	IsLoadingErrorGroup = "@codeError/IsLoadingErrorGroup",
}

export type FunctionToEdit = {
	codeBlock: string;
	symbol: string;
	uri: string;
	codeBlockStartLine: number;
};

export type CodeErrorsState = {
	bootstrapped: boolean;
	codeErrors: Index<CSCodeError>;
	errorGroups: Index<{
		id: string;
		error?: string;
		isLoading?: boolean;
		errorGroup: NewRelicErrorGroup;
	}>;
	functionToEdit?: FunctionToEdit;
	grokRepliesLength: number;
	grokError: CSAsyncError | undefined;
	functionToEditFailed: boolean;
};
