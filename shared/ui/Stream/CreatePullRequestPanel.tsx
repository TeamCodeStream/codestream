import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import CancelButton from "./CancelButton";
import { HostApi } from "../webview-api";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { TextInput } from "../Authentication/TextInput";
import { logError } from "../logger";
import { FormattedMessage } from "react-intl";
import cx from "classnames";
import { Link } from "./Link";
import { DropdownButton } from "./Review/DropdownButton";
import { LoadingMessage } from "../src/components/LoadingMessage";
import {
	CreatePullRequestRequestType,
	CheckPullRequestPreconditionsRequestType,
	ChangeDataType,
	DidChangeDataNotificationType,
	GetReposScmRequestType,
	GetBranchesRequestType,
	ReposScm,
	CheckPullRequestPreconditionsResponse,
	GetLatestCommitScmRequestType,
	DiffBranchesRequestType,
	ExecuteThirdPartyRequestUntypedType,
	FetchRemoteBranchRequestType,
	FetchBranchCommitsStatusRequestType,
	ReadTextFileRequestType
} from "@codestream/protocols/agent";
import { connectProvider } from "./actions";
import { isConnected, getPRLabel } from "../store/providers/reducer";
import { CodeStreamState } from "../store";
import { inMillis } from "../utils";
import { useInterval, useTimeout } from "../utilities/hooks";
import {
	setCurrentReview,
	openPanel,
	setCurrentPullRequest,
	setCurrentRepo,
	closeAllPanels,
	setNewPullRequestOptions
} from "../store/context/actions";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { PrePRProviderInfoModal } from "./PrePRProviderInfoModal";
import Icon from "./Icon";
import { NewPullRequestBranch, OpenUrlRequestType } from "@codestream/protocols/webview";
import { Checkbox } from "../src/components/Checkbox";
import { PanelHeader } from "../src/components/PanelHeader";
import { CSMe } from "@codestream/protocols/api";
import { EMPTY_STATUS } from "./StartWork";
import Tooltip from "./Tooltip";
import { PullRequestFilesChangedList } from "./PullRequestFilesChangedList";
import { PRBranch, PRError } from "./PullRequestComponents";
import { InlineMenu } from "../src/components/controls/InlineMenu";

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

// select service
const Step1 = props => (props.step !== 1 ? null : <div>{props.children}</div>);

// service loading
const Step2 = props => (props.step !== 2 ? null : <div>{props.children}</div>);

// form
const Step3 = props => (props.step !== 3 ? null : <div>{props.children}</div>);

// success! PR was created but we need to link to the web site
const Step4 = props => (props.step !== 4 ? null : <div>{props.children}</div>);

const EMPTY_ERROR = { message: "", type: "", url: "", id: "" };
const EMPTY_WARNING = { message: "", type: "", url: "", id: "" };

export const CreatePullRequestPanel = props => {
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

		return {
			repos: state.repos,
			currentUser,
			supportedPullRequestViewProviders,
			userStatus: status,
			providers: providers,
			codeHostProviders: codeHostProviders,
			reviewId: context.createPullRequestReviewId,
			isConnectedToGitHub: isConnected(state, { id: "github*com" }),
			isConnectedToGitLab: isConnected(state, { id: "gitlab*com" }),
			isConnectedToBitbucket: isConnected(state, { id: "bitbucket*org" }),
			isConnectedToGitHubEnterprise: isConnected(state, { id: "github/enterprise" }),
			isConnectedToGitLabEnterprise: isConnected(state, { id: "gitlab/enterprise" }),
			isConnectedToBitbucketServer: isConnected(state, { id: "bitbucket/server" }),
			prLabel: getPRLabel(state),
			currentRepo: context.currentRepo,
			ideName: state.ide.name,
			newPullRequestOptions: state.context.newPullRequestOptions,
			isOnPrem: configs.isOnPrem
		};
	});
	const { userStatus, reviewId, prLabel } = derivedState;

	const [loading, setLoading] = useState(true);
	const [loadingBranchInfo, setLoadingBranchInfo] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [pullSubmitting, setPullSubmitting] = useState(false);

	const [preconditionError, setPreconditionError] = useState(EMPTY_ERROR);
	const [preconditionWarning, setPreconditionWarning] = useState(EMPTY_WARNING);
	const [unexpectedError, setUnexpectedError] = useState(false);

	const [formState, setFormState] = useState({ message: "", type: "", url: "", id: "" });
	const [titleValidity, setTitleValidity] = useState(true);
	const pauseDataNotifications = useRef(false);

	const [reviewBranch, setReviewBranch] = useState("");
	const [branches, setBranches] = useState([] as string[]);
	const [remoteBranches, setRemoteBranches] = useState([] as string[]);
	const [requiresUpstream, setRequiresUpstream] = useState(false);
	const [origins, setOrigins] = useState([] as string[]);
	const [latestCommit, setLatestCommit] = useState("");

	// states used to create the eventual pr
	const [prBranch, setPrBranch] = useState("");
	const [prTitle, setPrTitle] = useState("");
	const [prText, setPrText] = useState("");
	const [prTextTouched, setPrTextTouched] = useState(false);
	const [numLines, setNumLines] = useState(8);

	const [prRemoteUrl, setPrRemoteUrl] = useState("");
	const [prProviderId, setPrProviderId] = useState("");
	const [prProviderIconName, setPrProviderIconName] = useState("");
	const [prUpstreamOn, setPrUpstreamOn] = useState(true);
	const [prUpstream, setPrUpstream] = useState("");
	const [prRepoId, setPrRepoId] = useState("");

	const [addressesStatus, setAddressesStatus] = useState(true);
	const [openRepos, setOpenRepos] = useState<ReposScm[]>([]);
	const [selectedRepo, setSelectedRepo] = useState<ReposScm | undefined>(undefined);

	const [currentStep, setCurrentStep] = useState(0);

	const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);
	const [filesChanged, setFilesChanged] = useState<any[]>([]);

	const [isWaiting, setIsWaiting] = useState(false);
	const [propsForPrePRProviderInfoModal, setPropsForPrePRProviderInfoModal] = useState<any>();

	const [prUrl, setPrUrl] = useState("");
	const [hasMounted, setHasMounted] = useState(false);

	const [acrossForks, setAcrossForks] = useState(false);
	const [forkedRepos, setForkedRepos] = useState<any[]>([]);
	const [parentRepo, setParentRepo] = useState<any>(undefined);
	const [baseForkedRepo, setBaseForkedRepo] = useState<any>(undefined);
	const [headForkedRepo, setHeadForkedRepo] = useState<any>(undefined);

	const [commitsBehindOrigin, setCommitsBehindOrigin] = useState(0);
	const [unexpectedPullError, setUnexpectedPullError] = useState(false);

	const [selectedTemplate, setSelectedTemplate] = useState<string>("");
	const [pullRequestTemplateNames, setPullRequestTemplateNames] = useState<string[] | undefined>();
	const [templatePath, setTemplatePath] = useState<string | undefined>("");

	const fetchPreconditionDataRef = useRef((isRepoUpdate?: boolean) => {});

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
			setLoading(true);
			setCurrentStep(0);
		}
		let newPullRequestBranch: NewPullRequestBranch | undefined = undefined;
		if (derivedState.newPullRequestOptions && derivedState.newPullRequestOptions.branch) {
			newPullRequestBranch = derivedState.newPullRequestOptions.branch!;
			dispatch(setNewPullRequestOptions());
		}

		try {
			const args: { [k: string]: any } = {
				reviewId: derivedState.reviewId,
				repoId: "",
				headRefName: ""
			};
			if (isRepoUpdate && prBranch && reviewBranch && selectedRepo && prProviderId) {
				// if we're updating data, we must get branches and repo from state
				args.providerId = prProviderId;
				args.repoId = selectedRepo.id;
				args.baseRefName = prBranch;
				args.headRefName = reviewBranch;
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
					setPrRepoId(args.repoId);

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
			if (result && result.success) {
				args.repoId = result.repoId!;
				setBranches(result.branches!);
				setRemoteBranches(result.remoteBranches!);
				setCommitsBehindOrigin(+result.commitsBehindOriginHeadBranch!);

				let newPrBranch = prBranch;
				let newReviewBranch = args.headRefName || reviewBranch || result.branch || "";
				if (result.pullRequestProvider && result.pullRequestProvider.defaultBranch) {
					newPrBranch = result.pullRequestProvider.defaultBranch;
				}
				setReviewBranch(newReviewBranch);
				setPrBranch(newPrBranch);

				setPrRemoteUrl(result.remoteUrl!);
				if (result.review && result.review.title) changePRTitle(result.review.title);

				const template = result.pullRequestTemplate || "";
				setNumLines(Math.max(template.split("\n").length, 8));
				setPullRequestTemplateNames(result.pullRequestTemplateNames);
				setTemplatePath(result.pullRequestTemplatePath);
				let newText = result.pullRequestTemplate || "";
				if (result.review && result.review.text) newText += result.review.text;
				if (!prTextTouched) setPrText(newText);

				setPrProviderId(result.providerId!);

				setCurrentStep(3);
				fetchFilesChanged(args.repoId, newPrBranch, newReviewBranch);

				if (newReviewBranch === newPrBranch) {
					setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
					setFormState({ type: "", message: "", url: "", id: "" });
					setCommitsBehindOrigin(+result.commitsBehindOriginHeadBranch!);
				} else if (result.warning && result.warning.type) {
					if (result.warning.type === "REQUIRES_UPSTREAM") {
						setRequiresUpstream(true);
						setOrigins(result.origins!);
						setPrUpstream(result.origins![0]);
					} else {
						setPreconditionWarning({
							type: result.warning.type,
							message: result.warning.message || "",
							url: result.warning.url || "",
							id: result.warning.id || ""
						});
					}
					// } else if (
					// 	result.pullRequestProvider &&
					// 	result.pullRequestProvider.defaultBranch === result.branch
					// ) {
					// 	setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
					// 	setFormState({ type: "", message: "", url: "", id: "" });
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
			const errorMessage = typeof error === "string" ? error : error.message;
			logError(`Unexpected error during pull request precondition check: ${errorMessage}`, {
				reviewId: derivedState.reviewId
			});
			setUnexpectedError(true);
		} finally {
			setLoading(false);
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

	useEffect(() => {
		fetchPreconditionData().then(_ => {
			setHasMounted(true);
		});

		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (pauseDataNotifications.current) return;
			if (e.type === ChangeDataType.Commits) {
				fetchPreconditionDataRef.current(true);
			}
		});
		return () => {
			disposable.dispose();
		};
	}, []);

	const changePRTitle = (title: string) => {
		setPrTitle(title);
		setTitleValidity(isTitleValid(title));
	};

	const isTitleValid = (title: string) => title != null && title !== "";

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "title":
				setTitleValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedError(false);
		pauseDataNotifications.current = true;
		if (!isTitleValid(prTitle)) {
			setTitleValidity(false);
			return;
		}

		let success = false;
		setSubmitting(true);
		setFormState({ message: "", type: "", url: "", id: "" });
		setPreconditionError({ message: "", type: "", url: "", id: "" });
		setPreconditionWarning({ message: "", type: "", url: "", id: "" });
		const headRefName = acrossForks
			? `${headForkedRepo.owner.login}:${reviewBranch}`
			: reviewBranch;
		const providerRepositoryId = acrossForks ? baseForkedRepo.id : undefined;
		try {
			const result = await HostApi.instance.send(CreatePullRequestRequestType, {
				reviewId: derivedState.reviewId!,
				repoId: prRepoId,
				providerId: prProviderId,
				title: prTitle,
				description: prText,
				baseRefName: prBranch,
				headRefName: headRefName,
				providerRepositoryId: providerRepositoryId,
				remote: prRemoteUrl,
				remoteName: prUpstreamOn && prUpstream ? prUpstream : undefined,
				addresses: addressesStatus
					? [{ title: userStatus.label, url: userStatus.ticketUrl }]
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
					props.closePanel();
					dispatch(setCurrentPullRequest(prProviderId, result.id!));
				} else {
					if (derivedState.reviewId) {
						props.closePanel();
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
			setSubmitting(false);
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

	const onPullSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedPullError(false);
		setPullSubmitting(true);

		try {
			await HostApi.instance.send(FetchRemoteBranchRequestType, {
				repoId: prRepoId,
				branchName: prBranch
			});
		} catch (error) {
			logError(error, {});
			logError(`Unexpected error during branch pulling : ${error}`, {});
			setUnexpectedPullError(true);
		} finally {
			setPullSubmitting(false);
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

		setLoadingBranchInfo(true);

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

		console.warn("CALLING CHECK WITH: ", localReviewBranch);
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
				if (result && result.warning && result.warning.type === "REQUIRES_UPSTREAM") {
					setRequiresUpstream(true);
					setOrigins(result.origins!);
					setPrUpstream(result.origins![0]);
				} else if (result && result.error) {
					// setFormState({
					// 	type: result.error.type || "UNKNOWN",
					// 	message: result.error.message || "",
					// 	url: result.error.url || ""
					// });
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
				if (!acrossForks) fetchFilesChanged(result.repoId!, localPrBranch, localReviewBranch);
				setLoadingBranchInfo(false);
			})
			.catch(error => {
				setPreconditionError({
					type: "UNKNOWN",
					message: typeof error === "string" ? error : error.message,
					url: "",
					id: ""
				});
			});
	};

	const fetchRepositoryForks = async () => {
		if (!prProviderId || !prRemoteUrl) return;

		try {
			const response = (await HostApi.instance.send(ExecuteThirdPartyRequestUntypedType, {
				method: "getForkedRepos",
				providerId: prProviderId,
				params: { remote: prRemoteUrl }
			})) as any;
			if (response) {
				const forks = response.forks || [];
				setForkedRepos(forks);
				setParentRepo(response.parent);
				setBaseForkedRepo(response.parent);
				setHeadForkedRepo(response.parent);
			}
		} catch (ex) {
			console.warn("getForkedRepos", ex);
		}
	};

	useEffect(() => {
		fetchRepositoryForks();
	}, [prProviderId, prRemoteUrl]);

	// 			.then((result: GetForkedRepositoriesResponse) => {
	// 			setPreconditionError({ type: "", message: "", url: "", id: "" });
	// 			setFormState({ type: "", message: "", url: "", id: "" });
	// 			if (result && result.error) {
	// 				setPreconditionError({
	// 					type: result.error.type || "UNKNOWN",
	// 					message: result.error.message || "",
	// 					url: result.error.url || "",
	// 					id: result.error.id || ""
	// 				});
	// 			} else if (result && result.warning) {
	// 				setPreconditionError({
	// 					type: result.warning.type || "UNKNOWN",
	// 					message: result.warning.message || "Unknown error.",
	// 					url: result.warning.url || "",
	// 					id: result.warning.id || ""
	// 				});
	// 			} else {
	// 				setFormState({ type: "", message: "", url: "", id: "" });
	// 			}
	// 			setForkedRepos(result.repositories);
	// 			// fetchFilesChanged(repoId, localPrBranch, localReviewBranch);
	// 			setLoadingBranchInfo(false);
	// 		})
	// 		.catch(error => {
	// 			setPreconditionError({
	// 				type: "UNKNOWN",
	// 				message: typeof error === "string" ? error : error.message,
	// 				url: "",
	// 				id: ""
	// 			});
	// 		});
	// };

	const renderBaseBranchesDropdown = () => {
		if (acrossForks) return renderBaseBranchesAcrossForksDropdown();
		if (!remoteBranches || !remoteBranches.length) return undefined;
		const items = remoteBranches!.map(_ => {
			const branchName = _.replace("origin/", "");
			return {
				label: _,
				searchLabel: _,
				key: _,
				action: async () => {
					setPrBranch(branchName);
					checkPullRequestBranchPreconditions(branchName, reviewBranch);
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
					<span className="subtle">base:</span> <strong>{prBranch || reviewBranch}</strong>
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
					setPrBranch(_.name);
					checkPullRequestBranchPreconditions(_.name, reviewBranch);
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
					<span className="subtle">base:</span> <strong>{prBranch}</strong>
				</DropdownButton>
			</span>
		);
	};

	const renderCompareBranchesDropdown = () => {
		if (acrossForks) return renderCompareBranchesAcrossForksDropdown();

		const items = branches!.map(_ => {
			return {
				label: _,
				searchLabel: _,
				key: _,
				action: async () => {
					setReviewBranch(_);
					checkPullRequestBranchPreconditions(prBranch, _);
				}
			};
		}) as any;
		if (items.length === 0) return undefined;
		if (items.length >= 10) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		return (
			<DropdownButton variant="secondary" items={items}>
				<span className="subtle">compare:</span> <strong>{reviewBranch}</strong>
			</DropdownButton>
		);
	};

	const renderPullButton = () => {
		return (
			<>
				<PRError>
					<Icon name="info" />
					<div style={{ marginRight: "10px" }}>
						{commitsBehindOrigin} commit
						{commitsBehindOrigin > 1 ? "s" : ""} behind base origin
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
							{text => <Link href="https://help.codestream.com">{text}</Link>}
						</FormattedMessage>
						.
					</div>
				)}
			</>
		);
	};

	const renderCompareBranchesAcrossForksDropdown = () => {
		if (!headForkedRepo || !headForkedRepo.refs) return null;
		const items = headForkedRepo.refs.nodes.map(_ => {
			return {
				label: _.name,
				searchLabel: _.name,
				key: _.name,
				action: () => {
					setReviewBranch(_.name);
					checkPullRequestBranchPreconditions(prBranch, _.name);
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
				<span className="subtle">compare:</span> <strong>{reviewBranch}</strong>
			</DropdownButton>
		);
	};

	const renderBaseReposDropdown = () => {
		if (acrossForks) return renderBaseReposAcrossForksDropdown();

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

	const renderCompareReposAcrossForksDropdown = () => {
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
		const { codeHostProviders, providers } = derivedState;
		let items = codeHostProviders.map(providerId => {
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
			let element = getErrorElement(preconditionError);
			if (element) {
				return (
					<>
						{(acrossForks || openRepos.length > 1) && !reviewId && (
							<PRError>
								<div className="control-group">
									<PRCompare>
										<PRDropdown>
											{!acrossForks && <Icon name="repo" />}
											{renderBaseReposDropdown()}
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
						{reviewId ? (
							"This feedback request"
						) : (
							<span>
								The compare branch <PRBranch>{reviewBranch}</PRBranch>
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
							{reviewId ? (
								"The feedback request"
							) : (
								<span>
									The compare branch <PRBranch>{reviewBranch}</PRBranch>
								</span>
							)}{" "}
							includes uncommitted changes. Commit and push your changes to include them.
						</span>
					);
				} else {
					messageElement = (
						<span>
							A PR can't be created because{" "}
							{reviewId ? "the feedback request" : "the compare branch"} includes uncommitted
							changes. Commit and push your changes and then{" "}
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
										prProviderId &&
										derivedState.supportedPullRequestViewProviders.find(_ => _ === prProviderId)
									) {
										dispatch(closeAllPanels());
										dispatch(setCurrentPullRequest(prProviderId, id));
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
		if (prProviderId) {
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
			repoId: prRepoId,
			branch: reviewBranch
		});
		if (result) {
			setLatestCommit(result.shortMessage);
		}
	};

	useEffect(() => {
		getLatestCommit();
	}, [selectedRepo, reviewBranch]);

	useEffect(() => {
		fetchBranchCommitsStatus();
	}, [prRepoId, prBranch, reviewBranch]);

	const fetchBranchCommitsStatus = async () => {
		if (!prRepoId) return;

		const commitsStatus = await HostApi.instance.send(FetchBranchCommitsStatusRequestType, {
			repoId: prRepoId,
			branchName: prBranch || reviewBranch
		});

		setCommitsBehindOrigin(+commitsStatus.commitsBehindOrigin);
	};

	const setTitleBasedOnBranch = () => {
		setPrTitle(
			reviewBranch.charAt(0).toUpperCase() +
				reviewBranch
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

	// const repositoryName = React.useMemo(() => {
	// 	selectedRepo
	// }, [review, selectedRepo]);

	const fetchFilesChanged = async (repoId: string, prBranch: string, reviewBranch: string) => {
		setIsLoadingDiffs(true);
		const response = await HostApi.instance.send(DiffBranchesRequestType, {
			repoId: repoId,
			baseRef: prBranch,
			headRef: reviewBranch
		});

		if (response.error) {
			setFilesChanged([]);
		} else if (response && response.filesChanged) {
			const { patches, data } = response.filesChanged;
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
		setIsLoadingDiffs(false);
	};

	// useEffect(() => {
	// 	if (prBranch && reviewBranch) fetchFilesChanged();
	// 	else setFilesChanged([]);
	// }, [prBranch, reviewBranch]);

	const [showDiffsAnyway, setShowDiffsAnyway] = useState(false);

	if (propsForPrePRProviderInfoModal) {
		return <PrePRProviderInfoModal {...propsForPrePRProviderInfoModal} />;
	}

	const tooManyDiffs = filesChanged && filesChanged.length > 100;
	const showDiffs = !acrossForks && (!tooManyDiffs || showDiffsAnyway);
	const showTooMany = !acrossForks && tooManyDiffs && !showDiffsAnyway;

	// console.warn("CURRENT STEP IS: ", currentStep, "PCE: ", preconditionError, "loading: ", loading);
	return (
		<Root className="full-height-codemark-form">
			<PanelHeader title={`Open a ${prLabel.PullRequest}`}>
				{reviewId ? "" : `Choose two branches to start a new ${prLabel.pullrequest}.`}
				{!reviewId && (
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
								{/*
									<div key="headshot" className="headline">
									<Headshot person={derivedState.currentUser} />
									<b>{derivedState.currentUser.username}</b>
									</div> 
								*/}
								<div className="spacer" />
								{!loading && formErrorMessages()}
								{loading && <LoadingMessage>Loading repo info...</LoadingMessage>}
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
												{text => <Link href="https://help.codestream.com">{text}</Link>}
											</FormattedMessage>
											.
										</div>
									)}
									<div className="control-group">
										<PRCompare>
											{acrossForks && <Icon name="git-compare" />}
											{(acrossForks || openRepos.length > 0) && !reviewId && (
												<PRDropdown>
													{!acrossForks && <Icon name="repo" />}
													{renderBaseReposDropdown()}
												</PRDropdown>
											)}
											<PRDropdown>
												{!acrossForks && <Icon name="git-compare" />}
												{renderBaseBranchesDropdown()}
											</PRDropdown>
											{acrossForks && (
												<PRDropdown>
													<Icon name="arrow-left" />
													{renderCompareReposAcrossForksDropdown()}
												</PRDropdown>
											)}
											<PRDropdown>
												{!acrossForks && <Icon name="arrow-left" />}
												{renderCompareBranchesDropdown()}
											</PRDropdown>
										</PRCompare>
									</div>
									{loadingBranchInfo && <LoadingMessage>Loading branch info...</LoadingMessage>}
									{(!loading && preconditionError.type) || loadingBranchInfo ? null : (
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
													{userStatus.label && (
														<Icon
															placement="top"
															title="Use Current Ticket"
															name={userStatus.ticketProvider || "ticket"}
															className="clickable"
															onMouseDown={() => changePRTitle(userStatus.label)}
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
													{reviewBranch && (
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
												{pullRequestTemplateNames && pullRequestTemplateNames.length > 0 && (
													<div style={{ marginBottom: "10px" }}>
														<DropdownButton
															variant="secondary"
															selectedKey={selectedTemplate}
															items={pullRequestTemplateNames
																.map(name => {
																	const path = `${name}.md`;
																	return {
																		label: name,
																		key: name,
																		action: async () => {
																			const response = (await HostApi.instance.send(
																				ReadTextFileRequestType,
																				{ path, baseDir: templatePath }
																			)) as any;
																			setSelectedTemplate(name);
																			setPrText(response.contents);
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
																			setSelectedTemplate("__none__");
																			setPrText("");
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
													rows={numLines > 20 ? 20 : numLines}
													value={prText}
													onChange={e => {
														setPrTextTouched(true);
														setPrText(e.target.value);
													}}
													placeholder={`${prLabel.Pullrequest} description (optional)`}
													style={{ resize: "vertical" }}
												/>
											</div>
											{requiresUpstream && origins && origins.length && (
												<div className="control-group">
													<Checkbox
														name="set-upstream"
														checked={prUpstreamOn}
														onChange={e => {
															const val = e.valueOf();
															setPrUpstreamOn(val);
															if (origins && origins.length === 1) {
																if (val) {
																	setPrUpstream(origins[0]);
																}
															}
														}}
													>
														<Tooltip
															title={`This will run 'git push -u ${prUpstream} ${reviewBranch}'`}
														>
															<span className="subtle">
																Set upstream to{" "}
																{origins.length > 1 && (
																	<DropdownButton
																		variant="text"
																		items={origins.map((_: any) => {
																			return {
																				label: `${_}/${reviewBranch}`,
																				key: _,
																				action: () => {
																					setPrUpstream(_);
																				}
																			};
																		})}
																	>
																		{`${prUpstream || origins[0]}/${reviewBranch}`}
																	</DropdownButton>
																)}
																{origins.length === 1 && (
																	<span className="highlight">
																		{origins[0]}/{reviewBranch}
																	</span>
																)}
															</span>
														</Tooltip>
													</Checkbox>
												</div>
											)}
											{userStatus && userStatus.label && (
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
														{userStatus.ticketUrl ? (
															<Link href={userStatus.ticketUrl}>
																{userStatus.ticketProvider && (
																	<Icon name={userStatus.ticketProvider} className="margin-right" />
																)}
																{userStatus.label}
															</Link>
														) : (
															<strong>
																{userStatus.ticketProvider && (
																	<Icon name={userStatus.ticketProvider} className="margin-right" />
																)}
																{userStatus.label}
															</strong>
														)}
													</Checkbox>
												</div>
											)}
											{!loading &&
												!loadingBranchInfo &&
												preconditionWarning.type &&
												preconditionWarningMessages()}

											<ButtonRow>
												<Button onClick={props.closePanel} variant="secondary">
													Cancel
												</Button>

												<Button onClick={onSubmit} isLoading={submitting}>
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
					{!loading && !loadingBranchInfo && preconditionError.type && preconditionErrorMessages()}
				</div>
				<div style={{ height: "40px" }} />
				{filesChanged.length > 0 && (
					<>
						<PanelHeader className="no-padding" title="Comparing Changes"></PanelHeader>
						{commitsBehindOrigin > 0 && renderPullButton()}
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
						isLoading={loadingBranchInfo || isLoadingDiffs}
						repoId={prRepoId}
						filesChanged={filesChanged}
						baseRef={prBranch}
						headRef={reviewBranch}
						baseRefName={prBranch}
						headRefName={reviewBranch}
					/>
				)}
			</span>
		</Root>
	);
};
