import {
	ComputeCurrentLocationResponse,
	ComputeCurrentLocationsRequestType,
	FileLevelTelemetryRequestOptions,
	FunctionLocator,
	GetFileLevelTelemetryRequestType,
	GetFileLevelTelemetryResponse
} from "@codestream/protocols/agent";
import { Container } from "../container";

export interface IObservabilityService {
	getFileLevelTelemetry(
		fileUri: string,
		languageId: string,
		resetCache?: boolean,
		locator?: FunctionLocator,
		options?: FileLevelTelemetryRequestOptions | undefined
	): Promise<GetFileLevelTelemetryResponse>;

	computeCurrentLocation(
		id: string,
		lineno: number,
		column: number,
		commit: string,
		functionName: string,
		uri: string
	): Promise<ComputeCurrentLocationResponse>;
}

class ObservabilityService implements IObservabilityService {
	getFileLevelTelemetry(
		fileUri: string,
		languageId: string,
		resetCache: boolean,
		locator?: FunctionLocator,
		options?: FileLevelTelemetryRequestOptions
	) {
		return Container.agent.sendRequest(GetFileLevelTelemetryRequestType, {
			fileUri,
			languageId,
			resetCache,
			locator,
			options
		});
	}

	computeCurrentLocation(
		id: string,
		lineno: number,
		column: number,
		commit: string,
		functionName: string,
		uri: string
	): Promise<ComputeCurrentLocationResponse> {
		return Container.agent.sendRequest(ComputeCurrentLocationsRequestType, {
			uri,
			commit,
			markers: [
				{
					id,
					referenceLocations: [
						{
							commitHash: commit,
							location: [lineno, 0, lineno, 0, undefined]
						}
					]
				}
			]
		});
	}
}

export const observabilityService = new ObservabilityService();
