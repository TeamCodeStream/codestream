import React, { useState, useEffect } from "react";
import { shallowEqual, useSelector } from "react-redux";
import {
	ReposScm,
	LicenseDependencyIssue,
	VulnerabilityIssue,
	FetchThirdPartyLicenseDependenciesRequestType,
	FetchThirdPartyVulnerabilitiesRequestType,
	FetchThirdPartyRepoMatchToFossaRequestType,
} from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { useMemoizedState, useDidMount } from "@codestream/webview/utilities/hooks";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import { PaneBody, PaneHeader, PaneState } from "@codestream/webview/src/components/Pane";
import { ConnectFossa } from "./ConnectFossa";
import { FossaIssues } from "./FossaIssues";
import { CurrentRepoContext } from "@codestream/webview/Stream/CurrentRepoContext";
import { FossaLoading } from "./FossaLoading";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

export const CodeAnalyzers = (props: Props) => {
	const [loading, setLoading] = useState<boolean | undefined>(undefined);
	const [licDeploading, setLicDepLoading] = useState<boolean>(false);
	const [vulnLoading, setVulnLoading] = useState<boolean>(false);
	const [licenseDepIssues, setLicenseDepIssues] = useState<LicenseDependencyIssue[]>([]);
	const [vulnIssues, setVulnIssues] = useState<VulnerabilityIssue[]>([]);
	const [currentRepoId, setCurrentRepoId] = useMemoizedState<string | undefined | null>(null);
	const [isRepoMatched, setIsRepoMatched] = useState<boolean | undefined>(undefined);

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
		const activeFile = editorContext?.activeFile;
		const currentRepo = props.openRepos.find(
			_ => editorContext?.textEditorUri?.includes(_.folder.uri) && _.id === currentRepoId,
		);

		const fossaProvider = Object.entries(providers).find(prov => {
			const [, provider] = prov;
			return Object.keys(providerInfo).includes(provider.name);
		});

		return {
			bootstrapped: Object.keys(providerInfo).length > 0,
			currentRepo,
			providers,
			fossaProvider,
			activeFile,
		};
	}, shallowEqual);

	useDidMount(() => {
		setLoading(true);
	});

	useEffect(() => {
		if (!derivedState.activeFile?.length || props.paneState === PaneState.Collapsed) {
			setLoading(false);
			return;
		}

		const fetchData = async (): Promise<void> => {
			try {
				if (currentRepoId !== null) {
					setLoading(true);
					const isRepoMatch: boolean | undefined = await fetchMatchRepoToFossa();
					setIsRepoMatched(isRepoMatch);
					if (isRepoMatch) {
						await fetchCodeAnalysis();
						await fetchVulnerabilities();
					}
					setLoading(false);
				}
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};
		fetchData();
	}, [currentRepoId, derivedState.providers, props.paneState]);

	const fetchMatchRepoToFossa = async (): Promise<boolean | undefined> => {
		if (currentRepoId === null) return;

		let isRepoMatch;
		const [providerId] = derivedState.fossaProvider ?? [];
		try {
			if (providerId) {
				const result = await HostApi.instance.send(FetchThirdPartyRepoMatchToFossaRequestType, {
					providerId,
					repoId: currentRepoId,
				});
				if (result.isRepoMatch !== undefined) {
					isRepoMatch = result.isRepoMatch;
				}
			}
		} catch (error) {
			console.error(error);
		}
		return isRepoMatch;
	};

	const fetchVulnerabilities = async (): Promise<void> => {
		let vulnerabilities: VulnerabilityIssue[] = [];
		if (vulnLoading) return;
		setVulnLoading(true);
		if (!currentRepoId) {
			setVulnLoading(false);
			return;
		}

		const [providerId] = derivedState.fossaProvider ?? [];
		try {
			if (providerId) {
				const result = await HostApi.instance.send(FetchThirdPartyVulnerabilitiesRequestType, {
					providerId,
					repoId: currentRepoId,
				});
				if (result.issues) {
					vulnerabilities = result.issues;
				}
			}
		} catch (error) {
			console.error(error);
		}
		setVulnIssues(vulnerabilities);
		setVulnLoading(false);
		setLoading(false);
	};

	const fetchCodeAnalysis = async (): Promise<void> => {
		if (licDeploading) return;
		setLicDepLoading(true);

		if (!currentRepoId) {
			setLicDepLoading(false);
			return;
		}
		let licenseDepIssues: LicenseDependencyIssue[] = [];
		const [providerId] = derivedState.fossaProvider ?? [];
		try {
			if (providerId) {
				const result = await HostApi.instance.send(FetchThirdPartyLicenseDependenciesRequestType, {
					providerId,
					repoId: currentRepoId,
				});
				if (result.issues) {
					licenseDepIssues = result.issues;
				}
			}
		} catch (error) {
			console.error(error);
		}
		setLicenseDepIssues(licenseDepIssues);
		setLicDepLoading(false);
		setLoading(false);
		return;
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
					{derivedState.bootstrapped && loading && <FossaLoading />}
					{derivedState.bootstrapped &&
						currentRepoId &&
						isRepoMatched &&
						derivedState.activeFile?.length &&
						!loading && <FossaIssues issues={licenseDepIssues} vulnIssues={vulnIssues} />}
					{derivedState.bootstrapped && !derivedState.activeFile?.length && !loading && (
						<div style={{ padding: "0 20px" }}>Open a source file to see FOSSA results.</div>
					)}
					{derivedState.bootstrapped &&
						!loading &&
						currentRepoId &&
						isRepoMatched === false &&
						derivedState.activeFile?.length && (
							<div style={{ padding: "0 20px" }}>No code analysis found for this repo.</div>
						)}
					{derivedState.bootstrapped &&
						!loading &&
						currentRepoId === undefined &&
						isRepoMatched === false &&
						!derivedState.currentRepo?.remotes?.length &&
						derivedState.activeFile?.length && (
							<div style={{ padding: "0 20px" }}>
								Repo does not have a git remote, try another repo.
							</div>
						)}
				</PaneBody>
			)}
		</>
	);
};
