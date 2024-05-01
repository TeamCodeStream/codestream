import { WebviewPanels } from "@codestream/protocols/api";
import {
	clearCurrentErrorsInboxOptions,
	clearCurrentInstrumentationOptions,
	clearCurrentPullRequest,
	closeModal,
	openPanel,
	setCurrentCodeErrorData,
	setCurrentCodemark,
	setCurrentMethodLevelTelemetry,
	setCurrentReview,
} from "@codestream/webview/store/context/actions";
import { createAppAsyncThunk } from "@codestream/webview/store/helper";

export const closeAllPanels = createAppAsyncThunk(
	"context/closeAllPanels",
	async (_, { dispatch }) => {
		dispatch(closeModal());
		dispatch(openPanel(WebviewPanels.Sidebar));
		dispatch(setCurrentCodemark());
		dispatch(setCurrentReview());
		dispatch(setCurrentCodeErrorData());
		dispatch(clearCurrentPullRequest());
		dispatch(clearCurrentErrorsInboxOptions());
		dispatch(clearCurrentInstrumentationOptions());
		dispatch(setCurrentMethodLevelTelemetry(undefined));
	}
);
