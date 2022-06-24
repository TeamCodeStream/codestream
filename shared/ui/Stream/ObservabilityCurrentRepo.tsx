import { forEach as _forEach } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { PaneBody, PaneHeader, PaneNode, PaneNodeName, PaneState } from "../src/components/Pane";
import { CodeStreamState } from "../store";
import { useDidMount, usePrevious } from "../utilities/hooks";
import { isNotOnDisk, ComponentUpdateEmitter, uriToFilePath } from "../utils";
import { setEditorContext } from "../store/editorContext/actions";
import {
	ScmError,
	getFileScmError,
	mapFileScmErrorForTelemetry
} from "../store/editorContext/reducer";
import { fetchDocumentMarkers } from "../store/documentMarkers/actions";
import {
	GetFileScmInfoRequestType,
	DidChangeDataNotificationType,
	ChangeDataType,
	GetReposScmRequestType
} from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";

interface Props {
	paneState?: PaneState;
}

const CurrentRepoContainer = styled.span`
	color: var(--text-color-subtle);
`;

export const ObservabilityCurrentRepo = React.memo((props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
			textEditorUri: state.editorContext.textEditorUri,
			scmInfo: state.editorContext.scmInfo
		};
	}, shallowEqual);

	const [currentRepoName, setCurrentRepoName] = useState<string>(`[repository]`);
	const [problem, setProblem] = useState();

	useDidMount(() => {
		onFileChanged(true, onFileChangedError);
	});

	useEffect(() => {
		if (String(derivedState.textEditorUri).length > 0) {
			onFileChanged(false, onFileChangedError);
		}
	}, [derivedState.textEditorUri]);

	const onFileChangedError = () => {
		// unused currently
	};

	const onFileChanged = async (
		isInitialRender = false,
		renderErrorCallback: ((error: string) => void) | undefined = undefined,
		checkBranchUpdate = false
	) => {
		let { scmInfo, textEditorUri } = derivedState;

		if (textEditorUri === undefined) {
			if (isInitialRender) {
				// this.setState({ isLoading: false });
			}
			if (renderErrorCallback !== undefined) {
				renderErrorCallback("InvalidUri");
			}
			return;
		}

		if (isNotOnDisk(textEditorUri)) {
			if (isInitialRender) {
				// this.setState({ isLoading: false });
			}
			if (renderErrorCallback !== undefined) {
				renderErrorCallback("FileNotSaved");
			}
			return;
		}

		if (!scmInfo || scmInfo.uri !== textEditorUri || checkBranchUpdate || currentRepoName) {
			if (textEditorUri) {
				scmInfo = await HostApi.instance.send(GetFileScmInfoRequestType, {
					uri: textEditorUri
				});
			}

			const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: true
			});

			const currentRepo = reposResponse.repositories?.find(
				repo => repo.id === scmInfo?.scm?.repoId
			);

			let repoName;
			if (currentRepo?.folder.name) {
				repoName = currentRepo.folder.name;
			}
			//@TODO: currentRepo.folder.name returning is flaky depending on IDE, specifically JB.
			//		 this ensures we will have the full repo name for the filter, but is a little hacky.
			if (!repoName && currentRepo?.path) {
				repoName = currentRepo.path.substring(currentRepo.path.lastIndexOf("/") + 1);
			}

			// this.setState({ repoName });
			setCurrentRepoName(repoName);

			dispatch(setEditorContext({ scmInfo }));
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

	return <CurrentRepoContainer>{currentRepoName}</CurrentRepoContainer>;
});
