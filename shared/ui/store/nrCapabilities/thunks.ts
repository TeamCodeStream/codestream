import { AppDispatch } from "@codestream/webview/store";
import { HostApi } from "@codestream/webview/webview-api";
import { NrCapabilitiesState } from "./types";
import { GetNewRelicAIEligibilityRequestType } from "@codestream/protocols/agent";
import { updateNrCapabilities } from "./actions";
import { createAppAsyncThunk } from "../helper";

export const bootstrapNrCapabilities = (accountIds: number[]) => async (dispatch: AppDispatch) => {
	Promise.all(accountIds.map(_ => dispatch(getNrCapability({ capability: "nrai", accountId: _ }))));
};

export const getNrCapability = createAppAsyncThunk<
	boolean,
	{ capability: keyof NrCapabilitiesState; accountId: number }
>("nrCapabilities/get", async ({ capability, accountId }, { getState, dispatch }) => {
	const { nrCapabilities } = getState();
	if (nrCapabilities[capability]?.[accountId] !== undefined) {
		return !!nrCapabilities[capability]?.[accountId];
	}
	let value: boolean;
	switch (capability) {
		case "nrai":
			value = await HostApi.instance.send(GetNewRelicAIEligibilityRequestType, { accountId });
			dispatch(updateNrCapabilities({ nrai: { ...nrCapabilities.nrai, [accountId]: value } }));
			return value;
	}
});
