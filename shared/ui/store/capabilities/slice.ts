import { Capabilities } from "@codestream/protocols/agent";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CapabilitiesState extends Capabilities {}

const initialState: CapabilitiesState = {};

const slice = createSlice({
	name: "capabilities",
	initialState,
	reducers: {
		updateCapabilities: (state, action: PayloadAction<CapabilitiesState>) => {
			return action.payload;
		},
	},
});

export const { updateCapabilities } = slice.actions;
export default slice;
