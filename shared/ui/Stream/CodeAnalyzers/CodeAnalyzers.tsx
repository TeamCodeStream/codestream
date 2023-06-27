import React, { useState, useEffect } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { ReposScm, FetchThirdPartyCodeAnalyzersRequestType } from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import { PaneBody, PaneHeader, PaneState } from "@codestream/webview/src/components/Pane";
import Icon from "../Icon";
import { ConnectFossa } from "./ConnectFossa";
import { FossaResults } from "./FossaResults";

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

	useEffect(() => {
		if (props.paneState === PaneState.Collapsed) return;
		fetchCodeAnalysis().catch(error => {
			console.error(error);
		});
	}, [
		derivedState.currentRepo,
		derivedState.providers,
		derivedState.providerInfo,
		props.paneState,
	]);

	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const fetchCodeAnalysis = async () => {
		if (loading) return;
		setLoading(true);
		if (!derivedState.currentRepo) {
			setLoading(false);
			return;
		}
		let msg;
		for (const [providerId, provider] of Object.entries(derivedState.providers)) {
			if (!Object.keys(derivedState.providerInfo).includes(provider.name)) continue;

			try {
				const result = await HostApi.instance.send(FetchThirdPartyCodeAnalyzersRequestType, {
					providerId,
				});
				if (result.message) {
					msg = result.message;
					break;
				}
			} catch (error) {
				console.error(error);
			}
		}
		setMessage(msg);
		setLoading(false);
	};

	return (
		<>
			<PaneHeader
				title="Code Analyzers"
				id={WebviewPanels.CodeAnalyzers}
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
				<PaneBody key="fossa">
					{!derivedState.bootstrapped && <ConnectFossa />}
					{derivedState.bootstrapped && <FossaResults message={message} />}
					{derivedState.bootstrapped && !derivedState.currentRepo && (
						<div style={{ padding: "0 20px 0 40px" }}>
							Please open a repo to start your Fossa Code Analysis.
						</div>
					)}
					{derivedState.bootstrapped &&
						!loading &&
						message.length === 0 &&
						derivedState.currentRepo && (
							<div style={{ padding: "0 20px 0 40px" }}>No code analysis found for this repo.</div>
						)}
				</PaneBody>
			)}
		</>
	);
};
