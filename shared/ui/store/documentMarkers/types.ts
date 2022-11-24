import { DocumentMarker, MarkerNotLocated } from "@codestream/protocols/agent";
import { Index } from "@codestream/utils/types";

export interface DocumentMarkersState extends Index<(DocumentMarker | MarkerNotLocated)[]> {}

export enum DocumentMarkersActionsType {
	SaveForFile = "@documentMarkers/SaveForFile",
	SaveOneForFile = "@documentMarkers/SaveOne",
}
