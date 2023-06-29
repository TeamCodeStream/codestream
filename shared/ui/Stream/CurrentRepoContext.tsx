import {
	GetFileScmInfoRequestType,
	GetReposScmRequestType,
	ObservabilityRepo,
} from "@codestream/protocols/agent";
import React, { useEffect, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import styled from "styled-components";
import { setUserPreference } from "./actions";
import { CodeStreamState } from "../store";
import { fetchDocumentMarkers } from "../store/documentMarkers/actions";
import { setEditorContext } from "../store/editorContext/actions";
import { getFileScmError, mapFileScmErrorForTelemetry } from "../store/editorContext/reducer";
import { useDidMount } from "../utilities/hooks";
import { isNotOnDisk } from "../utils";
import { HostApi } from "../webview-api";
import Icon from "./Icon";
import { useAppDispatch } from "../utilities/hooks";

interface Props {
	currentRepoCallback: (repoId?: string) => void;
	observabilityRepos?: ObservabilityRepo[];
}

const CurrentRepoContainer = styled.span`
	color: var(--text-color-subtle);
`;

export const CurrentRepoContext = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
			textEditorUri: state.editorContext.textEditorUri,
			scmInfo: state.editorContext.scmInfo,
		};
	}, shallowEqual);

	const [currentRepoName, setCurrentRepoName] = useState<string>(`[repository]`);
	const [problem, setProblem] = useState();

	useDidMount(() => {
		onFileChanged(onFileChangedError);
	});

	useEffect(() => {
		if (String(derivedState.textEditorUri).length > 0) {
			onFileChanged(onFileChangedError);
		}
	}, [props.observabilityRepos, derivedState.textEditorUri]);

	const onFileChangedError = () => {
		// unused currently
	};

	const onFileChanged = async (
		renderErrorCallback: ((error: string) => void) | undefined = undefined,
		checkBranchUpdate = false
	) => {
		let { scmInfo, textEditorUri } = derivedState;

		if (textEditorUri === undefined) {
			if (renderErrorCallback !== undefined) {
				renderErrorCallback("InvalidUri");
			}
			return;
		}

		if (isNotOnDisk(textEditorUri)) {
			if (renderErrorCallback !== undefined) {
				renderErrorCallback("FileNotSaved");
			}
			return;
		}

		if (!scmInfo || scmInfo.uri !== textEditorUri || checkBranchUpdate || currentRepoName) {
			if (textEditorUri) {
				scmInfo = await HostApi.instance.send(GetFileScmInfoRequestType, {
					uri: textEditorUri,
				});
			}

			const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: true,
			});

			const currentRepo = reposResponse.repositories?.find(
				repo => repo.id === scmInfo?.scm?.repoId
			);

			let repoName;
			if (currentRepo?.folder.name) {
				repoName = currentRepo.folder.name;
			}

			if (!repoName && currentRepo?.path) {
				repoName = currentRepo.path.substring(currentRepo.path.lastIndexOf("/") + 1);
			}

			if (!repoName && scmInfo?.scm?.repoPath) {
				repoName = scmInfo?.scm?.repoPath.substring(scmInfo?.scm?.repoPath.lastIndexOf("/") + 1);
			}

			await dispatch(setEditorContext({ scmInfo }));
			setCurrentRepoName(repoName);
			console.debug(
				`o11y: setting currentRepoCallback currentRepo?.id  ${currentRepo?.id} scmInfo?.scm?.repoId ${scmInfo?.scm?.repoId}`
			);
			props.currentRepoCallback(currentRepo?.id || scmInfo?.scm?.repoId);
			dispatch(
				setUserPreference({
					prefPath: ["currentO11yRepoId"],
					value: currentRepo?.id || scmInfo?.scm?.repoId,
				})
			);
		}

		let scmError;
		if (scmInfo) {
			scmError = getFileScmError(scmInfo);
			setProblem(scmError);
		}
		await fetchDocumentMarkers(textEditorUri);
		if (scmError && renderErrorCallback !== undefined) {
			renderErrorCallback(mapFileScmErrorForTelemetry(scmError));
		}
	};

	return (
		<CurrentRepoContainer>
			<Icon style={{ transform: "scale(0.7)", display: "inline-block" }} name="repo" />{" "}
			{currentRepoName}
		</CurrentRepoContainer>
	);
});
