import { createSlice } from "@reduxjs/toolkit";
import * as url from "url";
import { ConfigsState } from "./types";

const initialState: ConfigsState = {
	showHeadshots: true,
	debug: false,
	serverUrl: "",
	environment: "",
	isOnPrem: false,
	isProductionCloud: false,
};

const slice = createSlice({
	name: "configs",
	initialState,
	reducers: {
		updateConfigs: (state, action) => {
			return action.payload;
		},
	},
});

export const supportsSSOSignIn = (configs: Partial<ConfigsState>) => {
	// we can't support SSO sign-in if we are not using https
	if (!configs.serverUrl || url.parse(configs.serverUrl).protocol === "https:") {
		return true;
	} else {
		return false;
	}
};

export const { updateConfigs } = slice.actions;
export default slice.reducer;
