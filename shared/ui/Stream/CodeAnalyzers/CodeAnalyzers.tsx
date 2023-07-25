import React, { useState, useEffect, useMemo } from "react";
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
	const [currentRepoId, setCurrentRepoId] = useMemoizedState<string | undefined>(undefined);
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

		let currentRepoId = editorContext.scmInfo?.scm?.repoId;
		let currentRepo;
		if (currentRepoId) {
			currentRepo = props.openRepos.find(_ => _.id === editorContext.scmInfo?.scm?.repoId);
		} else {
			currentRepo = props.openRepos.find(_ => editorContext?.textEditorUri?.includes(_.folder.uri));
			currentRepoId = currentRepo?.id;
		}

		const fossaProvider = Object.entries(providers).find(prov => {
			const [, provider] = prov;
			return Object.keys(providerInfo).includes(provider.name);
		});

		return {
			bootstrapped: Object.keys(providerInfo).length > 0,
			currentRepo,
			currentRepoId,
			providerInfo,
			providers,
			fossaProvider,
			editorContext,
		};
	}, shallowEqual);

	const { fossa } = derivedState.providerInfo;
	const memoizedProviderInfo = useMemo(
		() => ({
			fossa,
		}),
		[fossa],
	);

	useDidMount(() => {
		setLoading(true);
	});

	useEffect(() => {
		if (!(derivedState.currentRepo || currentRepoId) || props.paneState === PaneState.Collapsed)
			return;

		const fetchData = async (): Promise<void> => {
			try {
				const isRepoMatched: boolean | undefined = await fetchMatchRepoToFossaProject();
				setIsRepoMatched(isRepoMatched);
				setLoading(false);
				if (isRepoMatched) {
					const licenseDep: LicenseDependencyIssue[] = await fetchCodeAnalysis();
					const vulnerabilities: VulnerabilityIssue[] = await fetchVulnerabilities();
					setLicenseDepIssues(licenseDep);
					setVulnIssues(vulnerabilities);
					setLicDepLoading(false);
					setVulnLoading(false);
				}
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};
		fetchData();
	}, [
		derivedState.currentRepo,
		currentRepoId,
		memoizedProviderInfo,
		derivedState.providers,
		props.paneState,
	]);

	const fetchMatchRepoToFossa = async (): Promise<boolean | undefined> => {
		if (!(derivedState.activeFile || currentRepoId === null)) return;

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

	const fetchVulnerabilities = async (): Promise<VulnerabilityIssue[]> => {
		let vulnerabilities: VulnerabilityIssue[] = [];
		if (vulnLoading) return vulnerabilities;
		setVulnLoading(true);
		if (!derivedState.currentRepo) {
			setVulnLoading(false);
			return vulnerabilities;
		}

		const [providerId] = derivedState.fossaProvider ?? [];
		try {
			if (providerId) {
				const result = await HostApi.instance.send(FetchThirdPartyVulnerabilitiesRequestType, {
					providerId,
					repoId: derivedState.currentRepoId,
				});
				if (result.issues) {
					vulnerabilities = result.issues;
				}
			}
		} catch (error) {
			console.error(error);
		}

		return vulnerabilities;
	};

	const fetchCodeAnalysis = async (): Promise<LicenseDependencyIssue[]> => {
		let licenseDepIssues: LicenseDependencyIssue[] = [];
		if (licDeploading) return licenseDepIssues;
		setLicDepLoading(true);

		if (!derivedState.currentRepo) {
			setLicDepLoading(false);
			return licenseDepIssues;
		}

		const [providerId] = derivedState.fossaProvider ?? [];
		try {
			if (providerId) {
				const result = await HostApi.instance.send(FetchThirdPartyLicenseDependenciesRequestType, {
					providerId,
					repoId: derivedState.currentRepoId,
				});
				if (result.issues) {
					licenseDepIssues = result.issues;
				}
			}
		} catch (error) {
			console.error(error);
		}

		return licenseDepIssues;
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
						derivedState.currentRepo &&
						currentRepoId &&
						isRepoMatched && <FossaIssues issues={licenseDepIssues} vulnIssues={vulnIssues} />}
					{derivedState.bootstrapped && !derivedState.currentRepo && !loading && (
						<div style={{ padding: "0 20px" }}>Open a source file to see FOSSA results.</div>
					)}
					{derivedState.bootstrapped &&
						derivedState.currentRepo &&
						currentRepoId &&
						!loading &&
						isRepoMatched === false && (
							<div style={{ padding: "0 20px" }}>No code analysis found for this repo.</div>
						)}
					{derivedState.bootstrapped &&
						derivedState.currentRepo &&
						isRepoMatched === false &&
						!currentRepoId &&
						!loading && (
							<div style={{ padding: "0 20px" }}>
								Repo does not have a git remote, try another repo.
							</div>
						)}
				</PaneBody>
			)}
		</>
	);
};
