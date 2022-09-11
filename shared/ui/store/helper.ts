import { CodeStreamState } from "@codestream/webview/store/index";
import {
	AsyncThunk,
	AsyncThunkOptions,
	AsyncThunkPayloadCreator,
	createAsyncThunk,
} from "@reduxjs/toolkit";

export function createAppAsyncThunk<Returned, ThunkArg = void>(
	typePrefix: string,
	payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, { state: CodeStreamState }>,
	options?: AsyncThunkOptions<ThunkArg, { state: CodeStreamState }>
): AsyncThunk<Returned, ThunkArg, { state: CodeStreamState }> {
	return createAsyncThunk(typePrefix, payloadCreator, options);
}
