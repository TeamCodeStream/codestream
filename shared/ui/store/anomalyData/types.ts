import { EntityObservabilityAnomalies } from "@codestream/protocols/agent";

export enum AnomalyDataActionsType {
	SetAnomalyData = "SetAnomalyData",
}

export type AnomalyDataState = {
	[key: string]: EntityObservabilityAnomalies;
};
