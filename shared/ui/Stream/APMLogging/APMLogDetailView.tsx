import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../../store";
import { closeModal } from "../actions";
import { Dialog } from "../../src/components/Dialog";
import { HostApi } from "@codestream/webview/webview-api";
import {
	GetLogsDetailRequestType,
	LogResult,
	isNRErrorResponse,
} from "@codestream/protocols/agent";

export const ObservabilityLogDetails = props => {
	const dispatch = useAppDispatch();

	const [logError, setLogError] = useState<string | undefined>("");
	const [logEntry, setLogEntry] = useState<LogResult | undefined>();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			entityGuid: state.context.currentAPMLoggingEntityGuid,
			logMessageId: state.context.currentAPMLoggingMessageId,
		};
	});

	useDidMount(() => {
		if (!derivedState.logMessageId) {
			handleError(
				"We were unable to locate the Log ID for the selected log entry; please contact support."
			);
			return;
		}

		if (!derivedState.entityGuid) {
			handleError(
				"We were unable to locate the Entity GUID for the selected log entry; please contact support."
			);
			return;
		}

		fetchLogDetails(derivedState.logMessageId);
	});

	const handleError = (message: string) => {
		setLogError(message);
		console.error(message);
	};

	const fetchLogDetails = async (logMessageId: string) => {
		try {
			const response = await HostApi.instance.send(GetLogsDetailRequestType, {
				logMessageId,
				entityGuid: derivedState.entityGuid!,
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching log detail information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			if (response.result) {
				setLogEntry(response.result);
			}
		} catch (ex) {
			handleError(ex);
		}
	};

	return (
		<Dialog title="Log Details" onClose={() => dispatch(closeModal())}>
			<table>
				<tbody>
					{logEntry &&
						Object.keys(logEntry).forEach((value, index) => {
							return (
								<tr>
									<th>{value}</th>
									<td>logEntry[value]</td>
								</tr>
							);
						})}
				</tbody>
			</table>
		</Dialog>
	);
};
