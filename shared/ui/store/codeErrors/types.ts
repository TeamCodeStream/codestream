import { CSCodeError } from "@codestream/protocols/api";
import { Index } from "@codestream/utils/types";
import { NewRelicErrorGroup } from "@codestream/protocols/agent";

export enum CodeErrorsActionsTypes {
	AddCodeErrors = "ADD_CODEERRORS",
	SaveCodeErrors = "@codeErrors/SaveCodeErrors",
	SetFunctionToEdit = "@codeErrors/SetFunctionToEdit",
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
	grokLoading: boolean;
	grokRepliesLength: number;
};
