import { IdeNames } from "@codestream/webview/ipc/host.protocol";
import { IdeState } from "@codestream/webview/store/ide/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: IdeState = { name: undefined };

const slice = createSlice({
	name: "ide",
	initialState,
	reducers: {
		setIde: (state, action: PayloadAction<IdeState>) => {
			if (action.payload.name) {
				action.payload.name = action.payload.name.toUpperCase() as IdeNames;
			}
			return action.payload;
		},
	},
});

export const { setIde } = slice.actions;
export default slice.reducer;
