import { ReposScm } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import React from "react";
import { shallowEqual, useSelector } from "react-redux";
import { WebviewPanels } from "../../ipc/webview.protocol.common";
import { PaneBody, PaneHeader, PaneState } from "../../src/components/Pane";
import Icon from "../Icon";
import { ConnectFossa } from "./ConnectFossa";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

export const CodeAnalyzers = (props: Props) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { editorContext, providers } = state;

		const providerInfo: { [key: string]: object | undefined } = {};
		for (const provider of ["fossa*com"]) {
			const name = providers[provider]?.name;
			if (name) {
				const userProvider = getUserProviderInfoFromState(name, state);
				if (userProvider) providerInfo[name] = userProvider;
			}
		}
		const currentRepoId = editorContext.scmInfo?.scm?.repoId;
		const currentRepo = props.openRepos.find(_ => _.id === currentRepoId);

		return {
			bootstrapped: Object.keys(providerInfo).length > 0,
			currentRepo,
			providerInfo,
			providers,
		};
	}, shallowEqual);

	return (
		<>
			<PaneHeader
				title="Code Analyzers"
				id={WebviewPanels.Fossa}
				subtitle={
					derivedState.currentRepo && (
						<>
							<span>
								<Icon
									name="repo"
									className="inline-label"
									style={{ transform: "scale(0.7)", display: "inline-block" }}
								/>
								{derivedState.currentRepo.folder.name}
							</span>
						</>
					)
				}
			></PaneHeader>
			{props.paneState != PaneState.Collapsed && (
				<PaneBody key="fossa">{!derivedState.bootstrapped && <ConnectFossa />}</PaneBody>
			)}
		</>
	);
};
