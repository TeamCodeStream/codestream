import { CSStream } from "@codestream/protocols/api";
import { Index } from "@codestream/utils/types";

export interface StreamsState {
	byTeam: {
		[teamId: string]: Index<CSStream>;
	};
}

export enum StreamActionType {
	ADD_STREAMS = "ADD_STREAMS",
	BOOTSTRAP_STREAMS = "BOOTSTRAP_STREAMS",
	UPDATE_STREAM = "UPDATE_STREAM",
	REMOVE_STREAM = "REMOVE_STREAM",
}
