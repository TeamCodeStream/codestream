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
import { PanelHeader } from "@codestream/webview/src/components/PanelHeader";
import ScrollBox from "../ScrollBox";

export const ObservabilityLogDetails = props => {
	const dispatch = useAppDispatch();

	const [logError, setLogError] = useState<string | undefined>("");
	const [logEntry, setLogEntry] = useState<LogResult | undefined>();
	const [maximized, setMaximized] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>();

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
		setIsLoading(true);

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

		setIsLoading(false);
	};

	return (
		<Dialog
			maximizable
			wide
			noPadding
			onMaximize={() => setMaximized(true)}
			onMinimize={() => setMaximized(false)}
			onClose={() => dispatch(closeModal())}
		>
			<PanelHeader title="Log Details"></PanelHeader>
			<div
				style={{
					height: maximized ? "calc(100vh - 100px)" : "calc(100vh - 200px)",
					overflow: "hidden",
					padding: "0px 20px 0px 20px",
					marginBottom: "20px",
				}}
			>
				<ScrollBox>
					<div className="vscroll">
						{!logError && !isLoading && logEntry && (
							<table style={{ width: "100%", borderCollapse: "collapse" }}>
								<tbody>
									{Object.keys(logEntry).map((v, i) => {
										return (
											<tr>
												<th>logEntry[v]</th>
												<td></td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}

						{logError && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								<h4>Uh oh, we've encounted an error!</h4>
								<span>{logError}</span>
							</div>
						)}
					</div>
				</ScrollBox>
			</div>
		</Dialog>
	);
};
