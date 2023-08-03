import React, { useState, useEffect } from "react";
import { shallowEqual, useSelector } from "react-redux";
import {
	FetchThirdPartyLicenseDependenciesRequestType,
	FetchThirdPartyRepoMatchToFossaRequestType,
	FetchThirdPartyVulnerabilitiesRequestType,
	LicenseDependencyIssue,
	ReposScm,
	VulnerabilityIssue,
} from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "@codestream/webview/store";
import { getUserProviderInfoFromState } from "@codestream/webview/store/providers/utils";
import { isFeatureEnabled } from "@codestream/webview/store/apiVersioning/reducer";
import { useMemoizedState } from "@codestream/webview/utilities/hooks";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import {
	PaneBody,
	PaneHeader,
	PaneState,
	NoContent,
} from "@codestream/webview/src/components/Pane";
import { ErrorRow } from "@codestream/webview/Stream/Observability";
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
	const [loading, setLoading] = useState<boolean | undefined>(true);
	const [error, setError] = useState<string | undefined>(undefined);
	const [repoMatchError, setRepoMatchError] = useState<string | undefined>(undefined);
	const [isRepoMatch, setIsRepoMatch] = useState<boolean | undefined>(undefined);
	const [licDepLoading, setLicDepLoading] = useState<boolean>(false);
	const [licenseDepIssues, setLicenseDepIssues] = useState<LicenseDependencyIssue[]>([]);
	const [licDepError, setLicDepError] = useState<string | undefined>(undefined);
	const [vulnLoading, setVulnLoading] = useState<boolean>(false);
	const [vulnIssues, setVulnIssues] = useState<VulnerabilityIssue[]>([]);
	const [vulnError, setVulnError] = useState<string | undefined>(undefined);
	const [currentRepoId, setCurrentRepoId] = useMemoizedState<string | undefined | null>(null);

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
			showCodeAnalyzers: isFeatureEnabled(state, "showCodeAnalyzers"),
		};
	}, shallowEqual);

	useEffect(() => {
		if (!derivedState.showCodeAnalyzers || props.paneState === PaneState.Collapsed) {
			return;
		}

		const fetchData = async (): Promise<void> => {
			let error: string | undefined;
			try {
				if (currentRepoId !== null) {
					setLoading(true);
					const isRepoMatch: boolean | undefined = await fetchMatchRepoToFossa();
					if (isRepoMatch) {
						await fetchLicenseDependencies();
						await fetchVulnerabilities();
						setLoading(false);
					} else {
						setLoading(false);
					}
				}
			} catch (err) {
				console.error("Error fetching data: ", err);
				error = err;
				setLoading(false);
			}
			setError(error);
		};
		fetchData();
	}, [currentRepoId, derivedState.providers, props.paneState]);

	const fetchMatchRepoToFossa = async (): Promise<boolean | undefined> => {
		if (currentRepoId === null) return;

		let isRepoMatch;
		let error: string | undefined;
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
				if (result.error) {
					error = result.error;
				}
			}
		} catch (err) {
			console.error("Error matching repo to FOSSA: ", err.message);
			error = err.message;
		}
		setRepoMatchError(error);
		setIsRepoMatch(isRepoMatch);
		return isRepoMatch;
	};

	const fetchVulnerabilities = async (): Promise<void> => {
		if (vulnLoading || !currentRepoId) return;
		setVulnLoading(true);

		let vulnerabilities: VulnerabilityIssue[] = [];
		let error: string | undefined;
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
				if (result.error) {
					error = result.error;
				}
			}
		} catch (err) {
			error = err;
			console.error("Error fetching vulnerabilities: ", err);
		}
		setVulnIssues(vulnerabilities);
		setVulnError(error);
		setVulnLoading(false);
	};

	const fetchLicenseDependencies = async (): Promise<void> => {
		if (licDepLoading || !currentRepoId) return;
		setLicDepLoading(true);

		let licenseDepIssues: LicenseDependencyIssue[] = [];
		let error: string | undefined;
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
				if (result.error) {
					error = result.error;
				}
			}
		} catch (err) {
			console.error("Error fetching license dependencies: ", err);
			error = err;
		}
		setLicenseDepIssues(licenseDepIssues);
		setLicDepError(error);
		setLicDepLoading(false);
	};

	const loaded = derivedState.bootstrapped && !loading && !props.reposLoading;

	const conditionalText = (): string => {
		if (error) {
			return "Sorry an error occurred, please try again";
		}
		if (repoMatchError) {
			return repoMatchError;
		}
		if (!derivedState.hasReposOpened) {
			return "No repositories found";
		}
		if (currentRepoId && isRepoMatch === false) {
			return "Project not found on FOSSA";
		}
		if (derivedState.hasRemotes === false && derivedState.hasActiveFile) {
			return "Repo does not have a git remote, try another repo.";
		}
		return "";
	};

	const hasConditionalText = conditionalText();

	if (!derivedState.showCodeAnalyzers) return null;
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
					{loaded && isRepoMatch && (
						<FossaIssues
							licDepIssues={licenseDepIssues}
							licDepError={licDepError}
							vulnIssues={vulnIssues}
							vulnError={vulnError}
						/>
					)}
					{loaded && derivedState.hasReposOpened && !derivedState.hasActiveFile && (
						<NoContent>Open a source file to see FOSSA results.</NoContent>
					)}
					{loaded && hasConditionalText && (
						<ErrorRow title={hasConditionalText} customPadding={"0 10px 0 20px"} />
					)}
				</PaneBody>
			)}
		</>
	);
};
