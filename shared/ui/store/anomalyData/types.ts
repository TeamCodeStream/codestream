import { EntityObservabilityAnomalies } from "@codestream/protocols/agent";

export interface AnomalyDataState {
	[key: string]: EntityObservabilityAnomalies
}

export enum AnomalyDataActionsType {
	SetAnomalyData = "SetAnomalyData"
}
