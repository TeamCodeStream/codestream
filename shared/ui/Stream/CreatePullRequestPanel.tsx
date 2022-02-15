import cx from "classnames";
import React, { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import {
	ChangeDataType,
	CheckPullRequestPreconditionsRequest,
	CheckPullRequestPreconditionsRequestType,
	CheckPullRequestPreconditionsResponse,
	CreatePullRequestRequest,
	CreatePullRequestRequestType,
	DidChangeDataNotification,
	DidChangeDataNotificationType,
	DiffBranchesRequestType,
	ExecuteThirdPartyRequestUntypedType,
	FetchBranchCommitsStatusRequestType,
	FetchRemoteBranchRequestType,
	GetBranchesRequestType,
	GetLatestCommitScmRequestType,
	GetReposScmRequestType,
	ProviderGetForkedReposResponse,
	ReadTextFileRequestType,
	ReposScm
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";

import { TextInput } from "../Authentication/TextInput";
import { NewPullRequestBranch, OpenUrlRequestType } from "../ipc/webview.protocol";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { PanelHeader } from "../src/components/PanelHeader";
import { CodeStreamState } from "../store";
import {
	closeAllPanels,
	openPanel,
	setCurrentPullRequest,
	setCurrentRepo,
	setCurrentReview,
	setNewPullRequestOptions
} from "../store/context/actions";
import { getPRLabelForProvider, isConnected } from "../store/providers/reducer";
import { useDidMount, useInterval, useTimeout } from "../utilities/hooks";
import { inMillis } from "../utils";
import { HostApi } from "../webview-api";
import { connectProvider } from "./actions";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { DropdownButton } from "./DropdownButton";
import Icon from "./Icon";
import { Link } from "./Link";
import { PrePRProviderInfoModal } from "./PrePRProviderInfoModal";
import { PRBranch, PRError } from "./PullRequestComponents";
import { PullRequestFilesChangedList } from "./PullRequestFilesChangedList";
import Tooltip from "./Tooltip";

export const EMPTY_STATUS = {
	label: "",
	ticketId: "",
	ticketUrl: "",
	ticketProvider: "",
	invisible: false
};

export const ButtonRow = styled.div`
	text-align: right;
	margin-top: 10px;
	button {
		// width: 18em;
	}
	button + button {
		margin-left: 10px;
	}
`;
const Root = styled.div`
	#controls {
		padding-top: 10px;
	}
	strong {
		font-weight: normal;
		color: var(--text-color-highlight);
	}
	a {
		text-decoration: none;
		color: var(--text-color-highlight);
		&:hover {
			color: var(--text-color-info) !important;
		}
	}
	.no-padding {
		padding: 0;
	}
`;
const PRCompare = styled.div`
	margin-top: 5px;
	button {
		margin: 0 10px 10px 0;
	}
	.octicon-arrow-left,
	.octicon-repo,
	.octicon-git-compare {
		margin-right: 10px;
	}
`;

const PRDropdown = styled.div`
	display: inline-block;
	white-space: nowrap;
`;

const lastStep = 4;
// select service
const Step1 = props => (props.step !== 1 ? null : <div>{props.children}</div>);

// service loading
const Step2 = props => (props.step !== 2 ? null : <div>{props.children}</div>);

// form
const Step3 = props => (props.step !== 3 ? null : <div>{props.children}</div>);

// success! PR was created but we need to link to the web site
const Step4 = props => (props.step !== lastStep ? null : <div>{props.children}</div>);

const EMPTY_ERROR = { message: "", type: "", url: "", id: "" };
const EMPTY_WARNING = { message: "", type: "", url: "", id: "" };

export const CreatePullRequestPanel = (props: { closePanel: MouseEventHandler<Element> }) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers, context, configs } = state;
		const teamId = state.context.currentTeamId;

		const supportedPullRequestViewProviders = [
			"github*com",
			"github/enterprise",
			"gitlab*com",
			"gitlab/enterprise"
		];
		const codeHostProviders = Object.keys(providers).filter(id =>
			[
				"github",
				"gitlab",
				"github_enterprise",
				"gitlab_enterprise",
				"bitbucket",
				"bitbucket_server"
			].includes(providers[id].name)
		);
		const currentUser = state.users[state.session.userId!] as CSMe;
		const status =
			currentUser.status && currentUser.status[teamId] && "label" in currentUser.status[teamId]
				? currentUser.status[teamId]
				: EMPTY_STATUS;

		const connectedCodeHostProviders = {};

		const isConnectedToGitHub = isConnected(state, { id: "github*com" });
		const isConnectedToGitLab = isConnected(state, { id: "gitlab*com" });
		const isConnectedToBitbucket = isConnected(state, { id: "bitbucket*org" });
		const isConnectedToGitHubEnterprise = isConnected(state, { id: "github/enterprise" });
		const isConnectedToGitLabEnterprise = isConnected(state, { id: "gitlab/enterprise" });
		const isConnectedToBitbucketServer = isConnected(state, { id: "bitbucket/server" });

		connectedCodeHostProviders["gitlab*com"] = isConnectedToGitHub;
		connectedCodeHostProviders["gitlab*com"] = isConnectedToGitLab;
		connectedCodeHostProviders["bitbucket*org"] = isConnectedToBitbucket;
		connectedCodeHostProviders["github/enterprise"] = isConnectedToGitHubEnterprise;
		connectedCodeHostProviders["gitlab/enterprise"] = isConnectedToGitLabEnterprise;
		connectedCodeHostProviders["bitbucket/server"] = isConnectedToBitbucketServer;

		return {
			repos: state.repos,
			currentUser,
			supportedPullRequestViewProviders,
			userStatus: status,
			providers: providers,
			codeHostProviders: codeHostProviders,
			reviewId: context.createPullRequestReviewId,
			connectedCodeHostProviders,
			isConnectedToGitHub,
			isConnectedToGitLab,
			isConnectedToBitbucket,
			isConnectedToGitHubEnterprise,
			isConnectedToGitLabEnterprise,
			isConnectedToBitbucketServer,
			currentRepo: context.currentRepo,
			ideName: state.ide.name,
			newPullRequestOptions: state.context.newPullRequestOptions,
			isOnPrem: configs.isOnPrem
		};
	});

	const pauseDataNotifications = useRef(false);

	// loaders
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingForkInfo, setIsLoadingForkInfo] = useState(false);
	const [isLoadingBranchInfo, setIsLoadingBranchInfo] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isWaiting, setIsWaiting] = useState(false);
	const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);

	// server warnings + errors
	const [preconditionError, setPreconditionError] = useState(EMPTY_ERROR);
	const [preconditionWarning, setPreconditionWarning] = useState(EMPTY_WARNING);
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [formState, setFormState] = useState({ message: "", type: "", url: "", id: "" });

	// client validation
	const [titleValidity, setTitleValidity] = useState(true);

	// lifecycle
	const [hasMounted, setHasMounted] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);

	// agent
	// this is the initial data request payload
	const [model, setModel] = useState<CheckPullRequestPreconditionsResponse | undefined>();
	const [prRequiresUpstream, setPrRequiresUpstream] = useState(false);
	// this is the request we're building up to create a pull request
	const [pending, setPending] = useState<CreatePullRequestRequest | undefined>({} as any);
	const [openRepos, setOpenRepos] = useState<ReposScm[]>([]);

	const [prProviderId, setPrProviderId] = useState("");
	const [prProviderIconName, setPrProviderIconName] = useState("");

	// pending PR values
	const [prTitle, setPrTitle] = useState("");
	const [prTextTouched, setPrTextTouched] = useState(false);

	const [prRemoteNameCreationRequested, setPrRemoteNameCreationRequested] = useState(true);
	const [prRemoteName, setPrRemoteName] = useState("");
	const [prRemoteNames, setPrRemoteNames] = useState([] as string[]);

	// post PR creation values
	const [prUrl, setPrUrl] = useState("");

	// forks
	const [acrossForks, setAcrossForks] = useState(false);
	const [forkedRepos, setForkedRepos] = useState<any[]>([]);
	const [parentRepo, setParentRepo] = useState<any>(undefined);
	const [baseForkedRepo, setBaseForkedRepo] = useState<any>(undefined);
	const [headForkedRepo, setHeadForkedRepo] = useState<any>(undefined);

	// others
	const [latestCommit, setLatestCommit] = useState("");
	const [commitsBehindOrigin, setCommitsBehindOrigin] = useState(0);
	const [addressesStatus, setAddressesStatus] = useState(true);
	const [selectedRepo, setSelectedRepo] = useState<ReposScm | undefined>(undefined);
	const [filesChanged, setFilesChanged] = useState<any[]>([]);
	const [propsForPrePRProviderInfoModal, setPropsForPrePRProviderInfoModal] = useState<any>();

	const fetchPreconditionDataRef = useRef((isRepoUpdate?: boolean) => {});

	const prLabel = useMemo(() => {
		return getPRLabelForProvider(model?.provider?.id || "");
	}, [model?.provider?.id]);

	const stopWaiting = useCallback(() => {
		setIsWaiting(false);
	}, [isWaiting]);

	const waitFor = inMillis(60, "sec");
	useTimeout(stopWaiting, waitFor);

	const fetchPreconditionData = async (isRepoUpdate = false) => {
		setFormState({ type: "", message: "", url: "", id: "" });
		setPreconditionError({ type: "", message: "", url: "", id: "" });
		setPreconditionWarning({ message: "", type: "", url: "", id: "" });
		// already waiting on a provider auth, keep using that loading ui
		if (currentStep != 2) {
			setIsLoading(true);
			setCurrentStep(0);
		}
		let newPullRequestBranch: NewPullRequestBranch | undefined = undefined;
		if (derivedState.newPullRequestOptions && derivedState.newPullRequestOptions.branch) {
			newPullRequestBranch = derivedState.newPullRequestOptions.branch!;
			dispatch(setNewPullRequestOptions());
		}

		try {
			const args: CheckPullRequestPreconditionsRequest = {
				reviewId: derivedState.reviewId,
				repoId: "",
				headRefName: ""
			};
			if (
				isRepoUpdate &&
				pending?.baseRefName &&
				pending?.headRefName &&
				selectedRepo &&
				model?.provider?.id
			) {
				// if we're updating data, we must get branches and repo from state
				args.providerId = model!.provider!.id;
				args.repoId = selectedRepo!.id;
				args.baseRefName = pending?.baseRefName;
				args.headRefName = pending?.headRefName;
				args.skipLocalModificationsCheck = true;
			} else if (!derivedState.reviewId) {
				// if we're not creating a PR from a review, then get the current
				// repo and branch from the editor
				const response = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
					includeConnectedProviders: true
				});

				if (response && response.repositories && response.repositories.length) {
					let panelRepo =
						selectedRepo ||
						(newPullRequestBranch != null &&
							response.repositories.find(
								_ => newPullRequestBranch && _.path === newPullRequestBranch.repoPath
							)) ||
						response.repositories.find(_ => _.providerId) ||
						response.repositories[0];
					if (derivedState.currentRepo && derivedState.currentRepo.id) {
						const currentRepoId = derivedState.currentRepo.id;
						const currentRepo = response.repositories.find(_ => _.id === currentRepoId);
						panelRepo = currentRepo ? currentRepo : panelRepo;
						dispatch(setCurrentRepo());
					}
					setOpenRepos(response.repositories);
					if (!selectedRepo) {
						setSelectedRepo(panelRepo);
					}
					args.repoId = panelRepo.id || "";

					let branchInfo;
					if (newPullRequestBranch && newPullRequestBranch.name) {
						branchInfo = await HostApi.instance.send(GetBranchesRequestType, {
							uri: newPullRequestBranch.repoPath
						});
					} else {
						branchInfo = await HostApi.instance.send(GetBranchesRequestType, {
							uri: panelRepo.folder.uri
						});
					}
					if (branchInfo && branchInfo.scm && branchInfo.scm.current) {
						args.headRefName = branchInfo.scm.current;
					}
					// FIXME if we kept track of the fork point, pass in the args.baseRefName here
				}
			}
			const result = await HostApi.instance.send(CheckPullRequestPreconditionsRequestType, args);
			if (result) {
				setModel(result);
			}
			if (result && result.success) {
				args.repoId = result.repo!.id!;

				if (result.repo) {
					setCommitsBehindOrigin(+result.repo.commitsBehindOriginHeadBranch!);
				}
				let newBaseRefName = pending?.headRefName;
				let newHeadRefName = args.headRefName || pending?.headRefName || result.repo?.branch || "";
				if (result.provider?.repo?.defaultBranch) {
					newBaseRefName = result.provider!.repo!.defaultBranch;
				}

				if (result.review && result.review.title) changePRTitle(result.review.title);

				let newText = result.provider?.pullRequestTemplate || "";
				if (result.review && result.review.text) newText += result.review.text;

				setPending({
					...pending!,
					repoId: result.repo!.id,
					baseRefName: newBaseRefName!,
					headRefName: newHeadRefName,
					description: !prTextTouched ? newText : ""
				});

				setPrProviderId(result.provider?.id!);

				const isFork = result?.provider?.repo?.isFork;
				if (isFork) {
					setAcrossForks(true);
					await fetchRepositoryForks(result.provider?.id!, result.repo?.remoteUrl!);
				}

				setCurrentStep(3);
				fetchFilesChanged(args.repoId, newBaseRefName!, newHeadRefName);
				setPrRequiresUpstream(false);

				if (newHeadRefName === newBaseRefName) {
					if (!isFork) {
						setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
					}
					setFormState({ type: "", message: "", url: "", id: "" });
				} else if (result.warning && result.warning.type) {
					if (result.warning.type === "REQUIRES_UPSTREAM") {
						setPrRequiresUpstream(true);
						setPrRemoteNames(result.repo?.remotes!);
						setPrRemoteName(result.repo!.currentRemote!);
					} else {
						setPreconditionWarning({
							type: result.warning.type,
							message: result.warning.message || "",
							url: result.warning.url || "",
							id: result.warning.id || ""
						});
					}
				} else {
					setPreconditionError({ type: "", message: "", url: "", id: "" });
				}
			} else if (result && result.error && result.error.type) {
				if (result.error.type === "REQUIRES_PROVIDER") {
					setCurrentStep(1);
				} else {
					if (result.error.type === "REQUIRES_PROVIDER_REPO") {
						setIsWaiting(false);
						setCurrentStep(1);
					}
					setPreconditionError({
						type: result.error.type || "UNKNOWN",
						message: result.error.message || "",
						url: result.error.url || "",
						id: result.error.id || ""
					});
				}
			}
		} catch (error) {
			console.warn(error);
			const errorMessage = typeof error === "string" ? error : error.message;
			logError(`Unexpected error during pull request precondition check: ${errorMessage}`, {
				reviewId: derivedState.reviewId
			});
			setUnexpectedError(true);
		} finally {
			setIsLoading(false);
		}
	};
	fetchPreconditionDataRef.current = fetchPreconditionData;

	useEffect(() => {
		// prevent this from firing if we haven't mounted yet
		if (!hasMounted) return;

		fetchPreconditionData();
	}, [
		selectedRepo && selectedRepo.id,
		derivedState.isConnectedToGitHub,
		derivedState.isConnectedToGitLab,
		derivedState.isConnectedToGitHubEnterprise,
		derivedState.isConnectedToGitLabEnterprise,
		derivedState.isConnectedToBitbucket,
		derivedState.isConnectedToBitbucketServer
	]);

	useEffect(() => {
		if (prProviderId) {
			const provider = derivedState.providers[prProviderId];
			const { name } = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (display && display.icon) {
				setPrProviderIconName(display.icon!);
			}
		}
	}, [prProviderId]);

	useDidMount(() => {
		fetchPreconditionData().then(_ => {
			setHasMounted(true);
		});

		const disposables: { dispose(): void }[] = [];
		disposables.push(
			HostApi.instance.on(DidChangeDataNotificationType, (e: DidChangeDataNotification) => {
				if (pauseDataNotifications.current) return;
				if (e.type === ChangeDataType.Commits) {
					fetchPreconditionDataRef.current(true);
				} else if (e.type === ChangeDataType.Workspace) {
					fetchPreconditionData();
				}
			})
		);

		return () => {
			disposables && disposables.forEach(_ => _?.dispose());
		};
	});

	const changePRTitle = (title: string) => {
		setPrTitle(title);
		setTitleValidity(isTitleValid(title));
	};

	const isTitleValid = (title: string) => title != null && title !== "";

	const onSubmit = async (e: React.MouseEvent) => {
		setUnexpectedError(false);
		pauseDataNotifications.current = true;
		if (!isTitleValid(prTitle)) {
			setTitleValidity(false);
			return;
		}

		let success = false;
		setIsSubmitting(true);
		setFormState({ message: "", type: "", url: "", id: "" });
		setPreconditionError({ message: "", type: "", url: "", id: "" });
		setPreconditionWarning({ message: "", type: "", url: "", id: "" });

		try {
			const result = await HostApi.instance.send(CreatePullRequestRequestType, {
				...pending!,
				reviewId: derivedState.reviewId,
				providerId: prProviderId,
				title: prTitle,
				isFork: acrossForks,
				baseRefRepoNameWithOwner: baseForkedRepo?.nameWithOwner,
				headRefRepoOwner: headForkedRepo?.owner,
				headRefRepoNameWithOwner: headForkedRepo?.nameWithOwner,
				headRefName: pending?.headRefName!,
				providerRepositoryId: acrossForks
					? baseForkedRepo.id
					: model?.provider?.repo?.providerRepoId,
				remote: model?.repo?.remoteUrl!,
				requiresRemoteBranch: prRemoteNameCreationRequested && prRemoteName != null,
				remoteName: prRemoteNameCreationRequested && prRemoteName ? prRemoteName : undefined,
				addresses: addressesStatus
					? [{ title: derivedState.userStatus.label, url: derivedState.userStatus.ticketUrl }]
					: undefined,
				ideName: derivedState.ideName
			});

			if (result.error) {
				setFormState({
					message: result.error.message || "",
					type: result.error.type || "UNKNOWN",
					url: result.error.url || "",
					id: result.error.id || ""
				});
			} else {
				HostApi.instance.track("Pull Request Created", {
					Service: prProviderId,
					"Associated Issue": addressesStatus
				});
				success = true;
				setFormState({ message: "", type: "", url: "", id: "" });
				if (
					result.id &&
					derivedState.supportedPullRequestViewProviders.find(_ => _ === prProviderId)
				) {
					props.closePanel(e);
					dispatch(setCurrentPullRequest(prProviderId, result.id!));
				} else {
					if (derivedState.reviewId) {
						props.closePanel(e);
						dispatch(setCurrentReview(derivedState.reviewId!));
					} else {
						setPrUrl(result.url!);
						setCurrentStep(4);
					}
				}
			}
		} catch (error) {
			logError(`Unexpected error during pull request creation: ${error}`, {});
			setUnexpectedError(true);
		} finally {
			setIsSubmitting(false);
			if (!success) {
				// resume the DataNotifications
				// if we didn't succeed...
				// if we were a success, the panel will just close
				pauseDataNotifications.current = false;
			}
		}
		if (success) {
			// create a small buffer for the provider to incorporate this change before re-fetching
			setTimeout(() => {
				HostApi.instance.emit(DidChangeDataNotificationType.method, {
					type: ChangeDataType.PullRequests,
					data: {
						prProviderId: prProviderId
					}
				});
			}, 100);
		}
	};

	const checkPullRequestBranchPreconditions = async (localPrBranch, localReviewBranch) => {
		if (acrossForks) {
			if (baseForkedRepo.id === headForkedRepo.id && localPrBranch === localReviewBranch) {
				setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
				setFormState({ type: "", message: "", url: "", id: "" });
				setFilesChanged([]);
				return;
			}
		} else if (localPrBranch === localReviewBranch) {
			setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
			setFormState({ type: "", message: "", url: "", id: "" });
			setFilesChanged([]);
			return;
		}

		// User has no access to "accross forks" screen until fork branch info
		// is done loading.  That screen does load branch info though, so this conditional
		// prevents showing an out of place loading spinner when fork branch info is being loaded
		// and the user is on the default non-accross forks pr create screen.
		if (!isLoadingForkInfo) setIsLoadingBranchInfo(true);

		let repoId: string = "";
		if (!derivedState.reviewId) {
			// if we're not creating a PR from a review, then get the current
			// repo and branch from the editor
			if (selectedRepo && selectedRepo.id) {
				repoId = selectedRepo.id;
			} else {
				const response = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
					includeConnectedProviders: true
				});

				if (response && response.repositories) {
					const providerRepo = response.repositories.find(_ => _.providerId);
					repoId = providerRepo ? providerRepo.id || "" : response.repositories[0].id || "";
				}
			}
		}

		HostApi.instance
			.send(CheckPullRequestPreconditionsRequestType, {
				providerId: prProviderId,
				reviewId: derivedState.reviewId,
				repoId,
				baseRefName: localPrBranch,
				headRefName: localReviewBranch,
				skipLocalModificationsCheck: true
			})
			.then((result: CheckPullRequestPreconditionsResponse) => {
				setPreconditionError({ type: "", message: "", url: "", id: "" });
				setPreconditionWarning({ type: "", message: "", url: "", id: "" });
				setFormState({ type: "", message: "", url: "", id: "" });
				setPrRequiresUpstream(false);

				if (result && result.warning && result.warning.type === "REQUIRES_UPSTREAM") {
					setPrRequiresUpstream(true);
					setPrRemoteNames(result.repo!.remotes!);
					setPrRemoteName(result.repo!.currentRemote!);
				} else if (result && result.error) {
					setPreconditionError({
						type: result.error.type || "UNKNOWN",
						message: result.error.message || "",
						url: result.error.url || "",
						id: result.error.id || ""
					});
				} else if (result && result.warning) {
					setPreconditionWarning({
						type: result.warning.type || "UNKNOWN",
						message: result.warning.message || "Unknown error.",
						url: result.warning.url || "",
						id: result.warning.id || ""
					});
				} else {
					setFormState({ type: "", message: "", url: "", id: "" });
				}
				// is there a way to fetch diffs across forks w/provider APIs?
				if (!acrossForks) fetchFilesChanged(result.repo!.id!, localPrBranch, localReviewBranch);
				setIsLoadingBranchInfo(false);
			})
			.catch(error => {
				setIsLoadingBranchInfo(false);

				setPreconditionError({
					type: "UNKNOWN",
					message: typeof error === "string" ? error : error.message,
					url: "",
					id: ""
				});
			});
	};

	const fetchRepositoryForks = async (providerId, remoteUrl) => {
		if (!providerId || !remoteUrl) return;

		setIsLoadingForkInfo(true);
		try {
			const response = (await HostApi.instance.send(ExecuteThirdPartyRequestUntypedType, {
				method: "getForkedRepos",
				providerId: providerId,
				params: { remote: remoteUrl }
			})) as ProviderGetForkedReposResponse;
			if (response) {
				const forks = response.forks || [];
				setForkedRepos(forks);
				setParentRepo(response.parent);
				setBaseForkedRepo(response.parent);
				setHeadForkedRepo(response.self);
			}
		} catch (ex) {
			console.warn("getForkedRepos", ex);
		} finally {
			setIsLoadingForkInfo(false);
		}
	};

	const renderBaseBranchesDropdown = () => {
		if (!model?.repo?.remoteBranches || !model?.repo?.remoteBranches.length) return undefined;

		var uniqueRemoteNamesCount = Object.keys(
			model?.repo?.remoteBranches.reduce((map, obj: { remote?: string }) => {
				if (obj.remote) {
					map[obj.remote] = true;
				}
				return map;
			}, {})
		).length;

		const items = model?.repo?.remoteBranches!.map(_ => {
			const label =
				uniqueRemoteNamesCount === 1 || !_.remote ? _.branch : `${_.remote}/${_.branch}`;
			return {
				label: label,
				searchLabel: label,
				key: label,
				action: async () => {
					setPending({
						...pending!,
						baseRefName: _.branch
					});
					checkPullRequestBranchPreconditions(_.branch, pending?.headRefName);
				}
			};
		}) as any;
		if (items.length === 0) return undefined;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		return (
			<span>
				<DropdownButton variant="secondary" items={items}>
					<span className="subtle">{prLabel.repoBranchBaseLabel}:</span>{" "}
					<strong>{pending?.baseRefName}</strong>
				</DropdownButton>
			</span>
		);
	};

	const renderBaseBranchesAcrossForksDropdown = () => {
		if (!baseForkedRepo || !baseForkedRepo.refs) return;

		const items = baseForkedRepo.refs.nodes.map(_ => {
			return {
				label: _.name,
				searchLabel: _.name,
				key: _.name,
				action: () => {
					setPending({
						...pending!,
						baseRefName: _.name
					});
					checkPullRequestBranchPreconditions(_.name, pending?.headRefName);
				}
			};
		});
		if (items.length === 0) return null;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		return (
			<span>
				<DropdownButton variant="secondary" items={items}>
					<span className="subtle">{prLabel.repoBranchBaseLabel}</span>{" "}
					<strong>{pending?.baseRefName}</strong>
				</DropdownButton>
			</span>
		);
	};

	const renderHeadBranchesDropdown = () => {
		if (!model || !model.repo) return null;

		const items = model.repo.branches!.map(_ => {
			return {
				label: _,
				searchLabel: _,
				key: _,
				action: async () => {
					setPending({
						...pending!,
						headRefName: _
					});

					checkPullRequestBranchPreconditions(pending?.baseRefName, _);
				}
			};
		}) as any[];
		if (items.length === 0) return undefined;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		return (
			<DropdownButton variant="secondary" items={items}>
				<span className="subtle">{prLabel.repoBranchHeadLabel}:</span>{" "}
				<strong>{pending?.headRefName}</strong>
			</DropdownButton>
		);
	};

	const renderHeadBranchesAcrossForksDropdown = () => {
		if (!headForkedRepo || !headForkedRepo.refs) return null;

		const items = headForkedRepo.refs.nodes.map(_ => {
			return {
				label: _.name,
				searchLabel: _.name,
				key: _.name,
				action: () => {
					setPending({
						...pending!,
						headRefName: _.name
					});
					checkPullRequestBranchPreconditions(pending?.baseRefName, _.name);
				}
			};
		});
		if (items.length === 0) return null;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		return (
			<DropdownButton variant="secondary" items={items}>
				<span className="subtle">{prLabel.repoBranchHeadLabel}:</span>{" "}
				<strong>{pending?.headRefName}</strong>
			</DropdownButton>
		);
	};

	const renderBaseReposDropdown = () => {
		const items = openRepos!.map(_ => {
			const repoName = _.id && derivedState.repos[_.id] ? derivedState.repos[_.id].name : _.path;
			return {
				label: repoName,
				searchLabel: repoName,
				key: _.folder.uri,
				action: async () => {
					setSelectedRepo(_);
				}
			};
		}) as any;
		if (items.length === 0) return undefined;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		if (
			derivedState.repos &&
			selectedRepo &&
			selectedRepo.id &&
			derivedState.repos[selectedRepo.id]
		) {
			return (
				<span>
					<DropdownButton variant="secondary" items={items}>
						<span className="subtle">repo:</span>{" "}
						<strong>{derivedState.repos[selectedRepo.id].name}</strong>
					</DropdownButton>
				</span>
			);
		} else {
			return null;
		}
	};

	const renderBaseReposAcrossForksDropdown = () => {
		const items = forkedRepos.map(repo => {
			const repoName = repo.nameWithOwner;
			return {
				label: repoName,
				searchLabel: repoName,
				key: repo.id,
				action: () => setBaseForkedRepo(repo)
			};
		}) as any;
		if (parentRepo) {
			items.unshift({
				label: parentRepo.nameWithOwner,
				searchLabel: parentRepo.nameWithOwner,
				key: parentRepo.id,
				action: () => setBaseForkedRepo(parentRepo)
			});
		}
		if (items.length === 0) return null;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		if (!baseForkedRepo) return null;
		return (
			<span>
				<DropdownButton variant="secondary" items={items}>
					<span className="subtle">base repo:</span> <strong>{baseForkedRepo.nameWithOwner}</strong>
				</DropdownButton>
			</span>
		);
	};

	const renderHeadReposAcrossForksDropdown = () => {
		const items = forkedRepos.map(repo => {
			const repoName = repo.nameWithOwner;
			return {
				label: repoName,
				searchLabel: repoName,
				key: repo.id,
				action: () => setHeadForkedRepo(repo)
			};
		}) as any;
		if (parentRepo) {
			items.unshift({
				label: parentRepo.nameWithOwner,
				searchLabel: parentRepo.nameWithOwner,
				key: parentRepo.id,
				action: () => setHeadForkedRepo(parentRepo)
			});
		}
		if (items.length === 0) return null;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		if (!headForkedRepo) return null;
		return (
			<span>
				<DropdownButton variant="secondary" items={items}>
					<span className="subtle">head repo:</span> <strong>{headForkedRepo.nameWithOwner}</strong>
				</DropdownButton>
			</span>
		);
	};

	const renderDisplayHost = host => {
		return host.startsWith("http://")
			? host.split("http://")[1]
			: host.startsWith("https://")
			? host.split("https://")[1]
			: host;
	};

	const renderProviders = () => {
		const { codeHostProviders, connectedCodeHostProviders, providers } = derivedState;
		let items = codeHostProviders.map(providerId => {
			// if we're already connected, don't show
			if (connectedCodeHostProviders[providerId]) return null;

			const provider = providers[providerId];
			const {
				name,
				isEnterprise,
				host,
				needsConfigure,
				needsConfigureForOnPrem,
				forEnterprise
			} = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (!display) return null;

			const displayHost = renderDisplayHost(host);
			const displayName = isEnterprise
				? `${display.displayName} - ${displayHost}`
				: display.displayName;
			let action;
			if (needsConfigure || (derivedState.isOnPrem && needsConfigureForOnPrem)) {
				// otherwise, if it's a provider that needs to be pre-configured,
				// bring up the custom popup for configuring it
				action = () =>
					dispatch(openPanel(`configure-provider-${name}-${providerId}-Integrations Panel`));
			} else if ((forEnterprise || isEnterprise) && name !== "jiraserver") {
				// otherwise if it's for an enterprise provider, configure for enterprise
				action = () => {
					dispatch(openPanel(`configure-enterprise-${name}-${providerId}-Integrations Panel`));
				};
			} else {
				// otherwise it's just a simple oauth redirect
				if (name === "github" || name === "bitbucket" || name === "gitlab") {
					action = () => {
						setPrProviderId(providerId);
						setPropsForPrePRProviderInfoModal({
							providerName: name,
							action: () => {
								dispatch(connectProvider(providerId, "Create Pull Request Panel"));
								setIsWaiting(true);
							},
							onClose: () => {
								setPropsForPrePRProviderInfoModal(undefined);
								setIsWaiting(true);
								setCurrentStep(2);
							}
						});
					};
				} else {
					action = () => {
						setPrProviderId(providerId);
						dispatch(connectProvider(providerId, "Create Pull Request Panel"));
						setIsWaiting(true);
						setCurrentStep(2);
					};
				}
			}

			return {
				label: (
					<span>
						{display.icon ? <Icon name={display.icon} style={{ marginRight: "4px" }} /> : undefined}
						{displayName}
					</span>
				),
				key: providerId,
				action: action
			};
		});
		const filteredItems = items.filter(Boolean) as any;
		if (!filteredItems.length) return undefined;

		return (
			<span>
				<DropdownButton variant="text" items={filteredItems}>
					<strong>select service</strong>
				</DropdownButton>
			</span>
		);
	};

	const preconditionErrorMessages = () => {
		if (preconditionError && preconditionError.type) {
			const element = getErrorElement(preconditionError);
			if (!element) return null;

			return (
				<>
					{(acrossForks || openRepos.length > 1) && !derivedState.reviewId && (
						<PRError>
							<div className="control-group">
								<PRCompare>
									<PRDropdown>
										{acrossForks ? (
											<> {renderBaseReposAcrossForksDropdown()}</>
										) : (
											<>
												<Icon name="repo" /> {renderBaseReposDropdown()}
											</>
										)}
									</PRDropdown>
								</PRCompare>
							</div>
						</PRError>
					)}
					<PRError>
						<Icon name="alert" />
						{element}
					</PRError>
				</>
			);
		}
		return null;
	};

	const preconditionWarningMessages = () => {
		if (preconditionWarning && preconditionWarning.type) {
			let element = getErrorElement(preconditionWarning, true);
			if (element) {
				return (
					<PRError>
						<Icon name="info" /> {element}
					</PRError>
				);
			}
		}
		return null;
	};

	const formErrorMessages = () => {
		if (!formState || !formState.type) return undefined;

		let formErrorMessageElement = getErrorElement(formState);
		if (formErrorMessageElement) {
			return (
				<PRError>
					<Icon name="alert" /> {formErrorMessageElement}
				</PRError>
			);
		}
		return undefined;
	};

	const getErrorElement = ({ type, message, url, id }, isWarning?: boolean) => {
		let messageElement = <></>;
		switch (type) {
			case "BRANCHES_MUST_NOT_MATCH": {
				messageElement = (
					<span>Choose different branches above to open a {prLabel.pullrequest}.</span>
				);
				break;
			}
			// TODO move these into en.js
			case "REPO_NOT_FOUND": {
				messageElement = <span>Repo not found</span>;
				break;
			}
			case "BRANCH_REMOTE_CREATION_FAILED": {
				const title = "Could not create branch remote";
				if (message) {
					messageElement = (
						<span>
							{title}
							{": "}
							{message}
						</span>
					);
				} else {
					messageElement = <span>{title}</span>;
				}

				break;
			}
			case "REPO_NOT_OPEN": {
				messageElement = <span>Repo not currently open</span>;
				break;
			}
			case "REQUIRES_PROVIDER_REPO": {
				messageElement = <span>{message}</span>;
				break;
			}
			case "REQUIRES_UPSTREAM": {
				// no message for this
				// we show additional UI for this
				break;
			}
			case "HAS_LOCAL_COMMITS": {
				messageElement = (
					<span>
						{derivedState.reviewId ? (
							"This feedback request"
						) : (
							<span>
								The compare branch <PRBranch>{pending?.headRefName}</PRBranch>
							</span>
						)}{" "}
						includes local commits. Push your changes to include them in your {prLabel.pullrequest}.
					</span>
				);
				break;
			}
			case "HAS_LOCAL_MODIFICATIONS": {
				if (isWarning) {
					messageElement = (
						<span>
							{derivedState.reviewId ? (
								"The feedback request"
							) : (
								<span>
									The compare branch <PRBranch>{pending?.headRefName}</PRBranch>
								</span>
							)}{" "}
							includes uncommitted changes. Commit and push your changes to include them.
						</span>
					);
				} else {
					messageElement = (
						<span>
							A PR can't be created because{" "}
							{derivedState.reviewId ? "the feedback request" : "the compare branch"} includes
							uncommitted changes. Commit and push your changes and then{" "}
							<Link onClick={onClickTryAgain}>try again</Link>.
						</span>
					);
				}
				// 	<span>
				// 	A PR can't be created because {reviewId ? "the feedback request" : "the compare branch"}{" "}
				// 	includes uncommitted changes. Commit and push your changes and then{" "}
				// 	<Link onClick={onClickTryAgain}>try again</Link>.
				// </span>
				break;
			}
			case "ALREADY_HAS_PULL_REQUEST": {
				if (url || id) {
					messageElement = (
						<div>
							<span>There is already an open {prLabel.pullrequest} for this branch.</span>
							<Button
								onClick={e => {
									e.preventDefault();
									if (
										id &&
										model &&
										model.provider &&
										model.provider.id &&
										derivedState.supportedPullRequestViewProviders.find(
											_ => _ === model.provider!.id
										)
									) {
										dispatch(closeAllPanels());
										dispatch(setCurrentPullRequest(model.provider.id, id));
									} else {
										HostApi.instance.send(OpenUrlRequestType, { url: url! });
									}
								}}
							>
								<Icon name="pull-request" /> View {prLabel.pullrequest}
							</Button>
						</div>
					);
				} else {
					messageElement = (
						<span>There is already an open {prLabel.pullrequest} for this branch</span>
					);
				}
				break;
			}
			case "PROVIDER": {
				messageElement = (
					<span
						dangerouslySetInnerHTML={{
							__html: message.replace(/\n/g, "<br />") || "Unknown provider error"
						}}
					/>
				);
				break;
			}
			default: {
				messageElement = <span>{message || "Unknown error"}</span>;
			}
		}
		return messageElement;
	};

	const onClickTryAgain = (event: React.SyntheticEvent) => {
		event.preventDefault();
		fetchPreconditionData();
	};

	const onClickTryReauthAgain = (event: React.SyntheticEvent) => {
		event.preventDefault();
		if (model?.provider?.id) {
			setCurrentStep(1);
		} else {
			fetchPreconditionData();
		}
	};

	function LoadingEllipsis() {
		const [dots, setDots] = useState(".");
		useInterval(() => {
			switch (dots) {
				case ".":
					return setDots("..");
				case "..":
					return setDots("...");
				case "...":
					return setDots(".");
			}
		}, 500);

		return <React.Fragment>{dots}</React.Fragment>;
	}

	const getLatestCommit = async () => {
		const result = await HostApi.instance.send(GetLatestCommitScmRequestType, {
			repoId: pending?.repoId!,
			branch: pending?.headRefName!
		});
		if (result) {
			setLatestCommit(result.shortMessage);
		}
	};

	useEffect(() => {
		getLatestCommit();
	}, [selectedRepo, pending?.headRefName]);

	useEffect(() => {
		fetchBranchCommitsStatus();
	}, [pending?.repoId, pending?.baseRefName, pending?.headRefName]);

	const fetchBranchCommitsStatus = async () => {
		if (!pending?.repoId) return;

		const commitsStatus = await HostApi.instance.send(FetchBranchCommitsStatusRequestType, {
			repoId: pending?.repoId!,
			branchName: (pending?.baseRefName || pending?.headRefName)!
		});

		setCommitsBehindOrigin(+commitsStatus.commitsBehindOrigin);
	};

	const setTitleBasedOnBranch = () => {
		if (!pending || !pending.headRefName) return;

		setPrTitle(
			pending.headRefName.charAt(0).toUpperCase() +
				pending.headRefName
					.slice(1)
					.replace("-", " ")
					.replace(/^(\w+)\//, "$1: ")
		);
	};

	const providerAuthenticationMessage = () => {
		let providerName = "Provider";
		if (prProviderId) {
			const provider = derivedState.providers[prProviderId];
			const { name } = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (display) providerName = display.displayName;
		}

		return isWaiting ? (
			<strong>
				Waiting for {providerName} authentication <LoadingEllipsis />
			</strong>
		) : (
			<strong>
				Authentication timed out. Please <Link onClick={onClickTryReauthAgain}>try again</Link>.
			</strong>
		);
	};

	const fetchFilesChanged = async (repoId: string, baseRefName: string, headRefName: string) => {
		setIsLoadingDiffs(true);
		try {
			const response = await HostApi.instance.send(DiffBranchesRequestType, {
				repoId: repoId,
				baseRef: baseRefName,
				headRef: headRefName
			});

			if (response.error) {
				setFilesChanged([]);
			} else if (response && response.filesChanged) {
				const { patches } = response.filesChanged;
				const filesChanged = patches
					.map(_ => {
						const fileName = _.newFileName === "/dev/null" ? _.oldFileName : _.newFileName;
						return {
							..._,
							linesAdded: _.additions,
							linesRemoved: _.deletions,
							file: fileName,
							filename: fileName,
							hunks: _.hunks,
							sha: _.sha
						};
					})
					.filter(_ => _.filename);
				setFilesChanged(filesChanged);
			}
		} catch (error) {
			console.warn(error);
			setFilesChanged([]);
		} finally {
			setIsLoadingDiffs(false);
		}
	};

	const [showDiffsAnyway, setShowDiffsAnyway] = useState(false);

	if (propsForPrePRProviderInfoModal) {
		return <PrePRProviderInfoModal {...propsForPrePRProviderInfoModal} />;
	}

	const tooManyDiffs = filesChanged && filesChanged.length > 100;
	const showDiffs = currentStep !== lastStep && !acrossForks && (!tooManyDiffs || showDiffsAnyway);
	const showTooMany = !acrossForks && tooManyDiffs && !showDiffsAnyway;

	return (
		<Root className="full-height-codemark-form">
			<PanelHeader title={`Open a ${prLabel.PullRequest}`}>
				{derivedState.reviewId ? "" : `Choose two branches to start a new ${prLabel.pullrequest}.`}
				{!derivedState.reviewId && (isLoadingForkInfo || isLoading) && (
					<Icon className="spin smaller" name="sync" />
				)}
				{!derivedState.reviewId && !isLoadingForkInfo && forkedRepos.length > 0 && (
					<>
						{" "}
						If you need to, you can also{" "}
						<a onClick={() => setAcrossForks(!acrossForks)}>compare across forks</a>.
					</>
				)}
			</PanelHeader>
			<CancelButton onClick={props.closePanel} />
			<span className="plane-container">
				<div className="codemark-form-container">
					<div className="codemark-form standard-form vscroll" id="code-comment-form">
						<fieldset className="form-body">
							<div id="controls">
								<div className="spacer" />
								{!isLoading && formErrorMessages()}
								{isLoading && <LoadingMessage>Loading repo info...</LoadingMessage>}
								<Step1 step={currentStep}>
									<div>
										Open a {prLabel.pullrequest} on {renderProviders()}
									</div>
								</Step1>
								<Step2 step={currentStep}>{providerAuthenticationMessage()}</Step2>
								<Step3 step={currentStep}>
									{unexpectedError && (
										<div className="error-message form-error">
											<FormattedMessage
												id="error.unexpected"
												defaultMessage="Something went wrong! Please try again, or "
											/>
											<FormattedMessage id="contactSupport" defaultMessage="contact support">
												{text => (
													<Link href="https://docs.newrelic.com/docs/codestream/">{text}</Link>
												)}
											</FormattedMessage>
											.
										</div>
									)}
									<div className="control-group">
										<PRCompare>
											{acrossForks ? (
												<>
													<Icon name="git-compare" />
													{(acrossForks || openRepos.length > 0) && !derivedState.reviewId && (
														<PRDropdown>{renderBaseReposAcrossForksDropdown()}</PRDropdown>
													)}
													<PRDropdown>{renderBaseBranchesAcrossForksDropdown()}</PRDropdown>

													<PRDropdown>
														<Icon name="arrow-left" />
														{renderHeadReposAcrossForksDropdown()}
													</PRDropdown>

													<PRDropdown>{renderHeadBranchesAcrossForksDropdown()}</PRDropdown>
												</>
											) : (
												<>
													{openRepos.length > 0 && !derivedState.reviewId && (
														<PRDropdown>
															<Icon name="repo" />
															{renderBaseReposDropdown()}
														</PRDropdown>
													)}
													<PRDropdown>
														<Icon name="git-compare" />
														{renderBaseBranchesDropdown()}
													</PRDropdown>

													<PRDropdown>
														<Icon name="arrow-left" />
														{renderHeadBranchesDropdown()}
													</PRDropdown>
												</>
											)}
										</PRCompare>
									</div>
									{isLoadingBranchInfo && <LoadingMessage>Loading branch info...</LoadingMessage>}
									{(!isLoading && preconditionError.type) || isLoadingBranchInfo ? null : (
										<div>
											{!titleValidity && (
												<small className={cx("explainer", { "error-message": !titleValidity })}>
													<FormattedMessage id="pullRequest.title" />
												</small>
											)}
											<div key="title" className="control-group has-input-actions">
												<TextInput
													name="title"
													value={prTitle}
													placeholder={`${prLabel.Pullrequest} title`}
													autoFocus
													onChange={setPrTitle}
												/>
												<div className="actions">
													{prTitle.length > 0 && (
														<Icon
															name="x"
															placement="top"
															title="Clear Title"
															className="clickable"
															onClick={() => changePRTitle("")}
														/>
													)}
													{derivedState.userStatus.label && (
														<Icon
															placement="top"
															title="Use Current Ticket"
															name={derivedState.userStatus.ticketProvider || "ticket"}
															className="clickable"
															onMouseDown={() => changePRTitle(derivedState.userStatus.label)}
														/>
													)}
													{latestCommit && (
														<Icon
															placement="topRight"
															title="Use Latest Commit Message"
															align={{ offset: [20, 0] }}
															name="git-commit-vertical"
															className="clickable"
															onMouseDown={() => changePRTitle(latestCommit)}
														/>
													)}
													{pending?.headRefName && (
														<Icon
															placement="topRight"
															align={{ offset: [5, 0] }}
															title="Use Branch Name"
															name="git-branch"
															className="clickable"
															onMouseDown={() => setTitleBasedOnBranch()}
														/>
													)}
												</div>
											</div>
											<div className="control-group">
												{model?.provider?.pullRequestTemplateNames &&
													model?.provider?.pullRequestTemplateNames.length > 0 && (
														<div style={{ marginBottom: "10px" }}>
															<DropdownButton
																variant="secondary"
																items={model?.provider?.pullRequestTemplateNames
																	.map(name => {
																		return {
																			label: name,
																			key: name,
																			action: async () => {
																				try {
																					const response = (await HostApi.instance.send(
																						ReadTextFileRequestType,
																						{
																							path: `${name}.md`,
																							baseDir: model?.provider?.pullRequestTemplatePath
																						}
																					)) as any;

																					setPending({
																						...pending!,
																						description: response.contents
																					});
																				} catch (ex) {
																					console.warn(ex);
																				}
																			}
																		} as any;
																	})
																	.concat(
																		{
																			label: "-"
																		},
																		{
																			label: "No template",
																			key: "__none__",
																			action: async () => {
																				setPending({ ...pending!, description: "" });
																			}
																		}
																	)}
															>
																Select a template
															</DropdownButton>
														</div>
													)}
												<textarea
													className="input-text"
													name="description"
													rows={
														model &&
														model.provider &&
														model?.provider?.pullRequestTemplateLinesCount &&
														model.provider.pullRequestTemplateLinesCount! > 20
															? 20
															: model?.provider?.pullRequestTemplateLinesCount || 8
													}
													value={pending?.description}
													onChange={e => {
														setPrTextTouched(true);
														setPending({ ...pending!, description: e.target.value });
													}}
													placeholder={`${prLabel.Pullrequest} description (optional)`}
													style={{ resize: "vertical" }}
												/>
											</div>
											{prRequiresUpstream && prRemoteNames && prRemoteNames.length && (
												<div className="control-group">
													<Checkbox
														name="set-upstream"
														checked={prRemoteNameCreationRequested}
														onChange={e => {
															const val = e.valueOf();
															setPrRemoteNameCreationRequested(val);
															if (prRemoteNames && prRemoteNames.length === 1) {
																if (val) {
																	setPrRemoteName(prRemoteNames[0]);
																}
															}
														}}
													>
														<Tooltip
															title={`This will run 'git push -u ${prRemoteName} ${pending?.headRefName}' before creating the ${prLabel.pullrequest}`}
														>
															<span className="subtle">
																Set upstream to{" "}
																{prRemoteNames.length > 1 && (
																	<DropdownButton
																		variant="text"
																		items={prRemoteNames.map((_: any) => {
																			return {
																				label: `${_}/${pending?.headRefName}`,
																				key: _,
																				action: () => {
																					setPrRemoteName(_);
																				}
																			};
																		})}
																	>
																		{`${prRemoteName || prRemoteNames[0]}/${pending?.headRefName}`}
																	</DropdownButton>
																)}
																{prRemoteNames.length === 1 && (
																	<span className="highlight">
																		{prRemoteNames[0]}/{pending?.headRefName}
																	</span>
																)}
															</span>
														</Tooltip>
													</Checkbox>
												</div>
											)}
											{derivedState.userStatus && derivedState.userStatus.label && (
												<div className="control-group">
													<Checkbox
														name="addresses"
														checked={addressesStatus}
														onChange={e => {
															const val = e.valueOf();
															setAddressesStatus(val);
														}}
													>
														<span className="subtle">This PR addresses: </span>
														{derivedState.userStatus.ticketUrl ? (
															<Link href={derivedState.userStatus.ticketUrl}>
																{derivedState.userStatus.ticketProvider && (
																	<Icon
																		name={derivedState.userStatus.ticketProvider}
																		className="margin-right"
																	/>
																)}
																{derivedState.userStatus.label}
															</Link>
														) : (
															<strong>
																{derivedState.userStatus.ticketProvider && (
																	<Icon
																		name={derivedState.userStatus.ticketProvider}
																		className="margin-right"
																	/>
																)}
																{derivedState.userStatus.label}
															</strong>
														)}
													</Checkbox>
												</div>
											)}
											{!isLoading &&
												!isLoadingBranchInfo &&
												preconditionWarning.type &&
												preconditionWarningMessages()}

											<ButtonRow>
												<Button onClick={props.closePanel} variant="secondary">
													Cancel
												</Button>

												<Button onClick={onSubmit} isLoading={isSubmitting}>
													{prProviderIconName && (
														<Icon name={prProviderIconName} style={{ marginRight: "3px" }} />
													)}
													Create {prLabel.PullRequest}
												</Button>
											</ButtonRow>
										</div>
									)}
								</Step3>
								<Step4 step={currentStep}>
									<PRError>
										<Icon name="pull-request" />
										<div>
											<span>{prLabel.Pullrequest} created.</span>
											<Button
												onClick={() => {
													HostApi.instance.send(OpenUrlRequestType, { url: prUrl! });
												}}
											>
												<Icon name="pull-request" /> View {prLabel.pullrequest}
											</Button>
										</div>
									</PRError>
								</Step4>
							</div>
						</fieldset>
					</div>
					{!isLoading &&
						!isLoadingBranchInfo &&
						preconditionError.type &&
						preconditionErrorMessages()}
				</div>
				{showDiffs && (
					<>
						<div style={{ height: "40px" }} />
						{filesChanged.length > 0 && (
							<>
								<PanelHeader className="no-padding" title="Comparing Changes"></PanelHeader>
								<PullLatest
									commitsBehindOrigin={commitsBehindOrigin}
									repoId={pending?.repoId}
									branchName={pending?.baseRefName}
								></PullLatest>
							</>
						)}
						{showTooMany && (
							<PRError onClick={() => setShowDiffsAnyway(true)}>
								<Icon name="info" />
								<div style={{ marginRight: "10px" }}>
									{filesChanged.length} files in this diff. Displaying them may impact performance.
								</div>
								<Button>Show anyway</Button>
							</PRError>
						)}
						{showDiffs && (
							<PullRequestFilesChangedList
								readOnly
								isLoading={isLoadingBranchInfo || isLoadingDiffs}
								repoId={pending?.repoId}
								filesChanged={filesChanged}
								baseRef={pending?.baseRefName!}
								headRef={pending?.headRefName!}
								baseRefName={pending?.baseRefName!}
								headRefName={pending?.headRefName!}
							/>
						)}
					</>
				)}
			</span>
		</Root>
	);
};

export const PullLatest = (props: {
	commitsBehindOrigin: number;
	repoId?: string;
	branchName?: string;
}) => {
	const [unexpectedPullError, setUnexpectedPullError] = useState(false);
	const [pullSubmitting, setPullSubmitting] = useState(false);

	if (props.commitsBehindOrigin < 1 || !props.repoId || !props.branchName) return null;

	const onPullSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedPullError(false);
		setPullSubmitting(true);

		try {
			await HostApi.instance.send(FetchRemoteBranchRequestType, {
				repoId: props.repoId!,
				branchName: props.branchName!
			});
		} catch (error) {
			logError(error, {});
			logError(`Unexpected error during branch pulling : ${error}`, {});
			setUnexpectedPullError(true);
		} finally {
			setPullSubmitting(false);
		}
	};

	return (
		<>
			<PRError>
				<Icon name="info" />
				<div style={{ marginRight: "10px" }}>
					{props.commitsBehindOrigin} commit
					{props.commitsBehindOrigin > 1 ? "s" : ""} behind base origin
				</div>
				<Button onClick={onPullSubmit} isLoading={pullSubmitting}>
					Pull
				</Button>
			</PRError>
			{unexpectedPullError && (
				<div className="error-message form-error" style={{ marginBottom: "10px" }}>
					<FormattedMessage
						id="error.unexpected"
						defaultMessage="Something went wrong! Please try again, or pull origin manually, or "
					/>
					<FormattedMessage id="contactSupport" defaultMessage="contact support">
						{text => <Link href="https://docs.newrelic.com/docs/codestream/">{text}</Link>}
					</FormattedMessage>
					.
				</div>
			)}
		</>
	);
};
