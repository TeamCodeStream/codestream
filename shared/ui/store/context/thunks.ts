import { WebviewPanels } from "@codestream/protocols/api";
import {
	clearCurrentErrorsInboxOptions,
	clearCurrentInstrumentationOptions,
	clearCurrentPullRequest,
	clearWantNewRelicOptions,
	closeModal,
	openPanel,
	setCurrentCodeError,
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
		dispatch(setCurrentCodeError());
		dispatch(clearCurrentPullRequest());
		dispatch(clearCurrentErrorsInboxOptions());
		dispatch(clearCurrentInstrumentationOptions());
		dispatch(clearWantNewRelicOptions());
		dispatch(setCurrentMethodLevelTelemetry(undefined));
	}
);
