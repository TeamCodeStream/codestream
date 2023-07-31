import React, { useState, useEffect } from "react";
import { shallowEqual, useSelector } from "react-redux";
import {
	ReposScm,
	LicenseDependencyIssue,
	VulnerabilityIssue,
	FetchThirdPartyLicenseDependenciesRequestType,
	FetchThirdPartyRepoMatchToFossaRequestType,
	FetchThirdPartyVulnerabilitiesRequestType,
} from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { useMemoizedState } from "@codestream/webview/utilities/hooks";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import {
	PaneBody,
	PaneHeader,
	PaneState,
	NoContent,
} from "@codestream/webview/src/components/Pane";
import { ConnectFossa } from "./ConnectFossa";
import { FossaIssues } from "./FossaIssues";
import { CurrentRepoContext } from "@codestream/webview/Stream/CurrentRepoContext";
import { FossaLoading } from "./FossaLoading";

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
	reposLoading: boolean;
}

export const CodeAnalyzers = (props: Props) => {
	const [loading, setLoading] = useState<boolean>(true);
	const [licDepLoading, setLicDepLoading] = useState<boolean>(false);
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
		const currentRepo = props.openRepos.find(_ => _.id === currentRepoId);
		const fossaProvider = Object.entries(providers).find(prov => {
			const [, provider] = prov;
			return Object.keys(providerInfo).includes(provider.name);
		});
		const hasActiveFile =
			!editorContext?.textEditorUri?.includes("terminal") &&
			editorContext?.activeFile &&
			editorContext?.activeFile.length > 0;

		const hasRemotes = currentRepo?.remotes && currentRepo?.remotes.length > 0;
		const hasReposOpened = props.openRepos.length > 0;

		return {
			bootstrapped: Object.keys(providerInfo).length > 0,
			providers,
			fossaProvider,
			hasActiveFile,
			hasRemotes,
			hasReposOpened,
		};
	}, shallowEqual);

	useEffect(() => {
		if (props.reposLoading || props.paneState === PaneState.Collapsed) {
			return;
		}
		if (!derivedState.hasActiveFile) {
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
						await fetchLicenseDependencies();
						await fetchVulnerabilities();
						setLoading(false);
					} else {
						setLoading(false);
					}
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
		if (vulnLoading || !currentRepoId) return;
		setVulnLoading(true);

		let vulnerabilities: VulnerabilityIssue[] = [];
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
	};

	const fetchLicenseDependencies = async (): Promise<void> => {
		if (licDepLoading || !currentRepoId) return;
		setLicDepLoading(true);

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
		return;
	};

	const loaded = derivedState.bootstrapped && !loading && !props.reposLoading;

	const conditionalText = (): string => {
		if (!derivedState.hasReposOpened) {
			return "No repositories found";
		}
		if (currentRepoId && isRepoMatched === false) {
			return "Project not found on FOSSA";
		}
		if (!derivedState.hasRemotes && derivedState.hasActiveFile) {
			return "Repo does not have a git remote, try another repo.";
		}
		return "";
	};

	const hasConditonalText = conditionalText();

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
					{loaded && isRepoMatched && (
						<FossaIssues issues={licenseDepIssues} vulnIssues={vulnIssues} />
					)}
					{loaded && derivedState.hasReposOpened && !derivedState.hasActiveFile && (
						<NoContent>Open a source file to see FOSSA results.</NoContent>
					)}
					{loaded && hasConditonalText && (
						<div style={{ padding: "0 20px" }}>{hasConditonalText}</div>
					)}
				</PaneBody>
			)}
		</>
	);
};
