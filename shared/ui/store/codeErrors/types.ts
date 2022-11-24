import { CSCodeError } from "@codestream/protocols/api";
import { Index } from "@codestream/utils/types";

export enum CodeErrorsActionsTypes {
	AddCodeErrors = "ADD_CODEERRORS",
	SaveCodeErrors = "@codeErrors/SaveCodeErrors",
	UpdateCodeErrors = "@codeErrors/UpdateCodeErrors",
	Delete = "@codeErrors/Delete",
	Bootstrap = "@codeErrors/Bootstrap",
	HandleDirectives = "@codeErrors/HandleDirectives",
	AddProviderError = "@codeErrors/AddError",
	ClearProviderError = "@codeErrors/ClearError",
	SetErrorGroup = "@codeError/SetErrorGroup",
	IsLoadingErrorGroup = "@codeError/IsLoadingErrorGroup",
}

export type CodeErrorsState = {
	bootstrapped: boolean;
	codeErrors: Index<CSCodeError>;
	errorGroups: Index<{
		id: string;
		error?: string;
		isLoading?: boolean;
		errorGroup: {
			id: string;
			// TODO fix me get the real object type
			assignee?: any;
			state?: any;
			repo?: string;
			entity?: {
				repo?: {
					urls: string[];
					name: string;
				};
			};
		};
	}>;
};
