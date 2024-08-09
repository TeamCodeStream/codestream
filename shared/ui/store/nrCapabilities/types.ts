export enum NrCapabilitiesActionsTypes {
	UpdateCapabilities = "@nrCapabilities/UpdateCapability",
}

export type NrCapabilitiesState = {
	nrai?: {
		[accountId: number]: boolean;
	};
};
