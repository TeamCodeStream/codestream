import { action } from "../common";
import { UnreadsActionsType, UnreadsState } from "./types";

export { reset } from "../actions";

export const updateUnreads = (data: UnreadsState) => action(UnreadsActionsType.Update, data);

export const resetLastReads = () => action(UnreadsActionsType.ResetLastReads);

export const resetLastReadItems = () => action(UnreadsActionsType.ResetLastReadItems);
