import React, { useState, useEffect, useMemo } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { ReposScm, FetchThirdPartyCodeAnalyzersRequestType } from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { useMemoizedState } from "@codestream/webview/utilities/hooks";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import { PaneBody, PaneHeader, PaneState } from "@codestream/webview/src/components/Pane";
import { ConnectFossa } from "./ConnectFossa";
import { FossaResults } from "./FossaResults";
import { CurrentRepoContext } from "@codestream/webview/Stream/CurrentRepoContext";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

export const CodeAnalyzers = (props: Props) => {
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [currentRepoId, setCurrentRepoId] = useMemoizedState<string | undefined>(undefined);

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

	// The way providerInfo is created is causing useEffect
	// to run in an infinite loop. Any new providers should be
	// added to this memoized object.
	const { fossa } = derivedState.providerInfo;
	const memoizedProviderInfo = useMemo(
		() => ({
			fossa,
		}),
		[fossa]
	);

	useEffect(() => {
		if (props.paneState === PaneState.Collapsed) return;
		fetchCodeAnalysis().catch(error => {
			console.error(error);
		});
	}, [derivedState.currentRepo, derivedState.providers, memoizedProviderInfo, props.paneState]);

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
				subtitle={<CurrentRepoContext currentRepoCallback={setCurrentRepoId} />}
			></PaneHeader>
			{props.paneState != PaneState.Collapsed && (
				<PaneBody key="fossa">
					{!derivedState.bootstrapped && <ConnectFossa />}
					{derivedState.bootstrapped && <FossaResults message={message} />}
					{derivedState.bootstrapped && !derivedState.currentRepo && (
						<div style={{ padding: "0 20px 0 40px" }}>Open a source file to see FOSSA results.</div>
					)}
					{derivedState.bootstrapped &&
						!loading &&
						message &&
						message.length === 0 &&
						derivedState.currentRepo && (
							<div style={{ padding: "0 20px 0 40px" }}>No code analysis found for this repo.</div>
						)}
				</PaneBody>
			)}
		</>
	);
};
