import { EntityObservabilityAnomalies } from "@codestream/protocols/agent";
import { action } from "../common";
import { AnomalyDataActionsType } from "./types";

export const setAnomalyData = (entityAnomalies: EntityObservabilityAnomalies) =>
	action(AnomalyDataActionsType.SetAnomalyData, entityAnomalies);
