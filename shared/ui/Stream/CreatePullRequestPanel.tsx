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
	DiffBranchesRequestType
} from "@codestream/protocols/agent";
import { connectProvider } from "./actions";
import { isConnected, getPRLabel } from "../store/providers/reducer";
import { CodeStreamState } from "../store";
import { inMillis } from "../utils";
import { useInterval, useTimeout } from "../utilities/hooks";
import { setCurrentReview, openPanel, setCurrentPullRequest } from "../store/context/actions";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { PrePRProviderInfoModal } from "./PrePRProviderInfoModal";
import Icon from "./Icon";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { Checkbox } from "../src/components/Checkbox";
import { PanelHeader } from "../src/components/PanelHeader";
import { CSMe } from "@codestream/protocols/api";
import Headshot from "./Headshot";
import { EMPTY_STATUS } from "./StartWork";
import Tooltip from "./Tooltip";
import { clearMyPullRequests } from "../store/providerPullRequests/actions";
import { css } from "react-select/src/components/SingleValue";import { InlineMenu } from "../src/components/controls/InlineMenu";
import { PRDiffHunks, PRDiffHunk } from "./PullRequestFilesChangedTab";
import { PullRequestPatch } from "./PullRequestPatch";
import { PullRequestFilesChangedList } from "./PullRequestFilesChangedList";

// base branch dropdown: show only pushed branches
// base branch dropdown: try to default to fork point branch

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
`;
const PRError = styled.div`
	padding: 15px 15px 10px 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	button {
		white-space: nowrap;
	}
	> .icon {
		flex-grow: 0;
		flex-shrink: 0;
		display: inline-block;
		margin-right: 15px;
		transform: scale(1.5);
	}
	> div {
		flex-grow: 10;
		display: flex;
		align-items: center;
		button {
			margin-left: auto;
		}
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
	.spacer {
		// height: 10px;
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

export const CreatePullRequestPanel = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;
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
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;

		return {
			repos: state.repos,
			currentUser,
			userStatus: status,
			providers: providers,
			codeHostProviders: codeHostProviders,
			reviewId: state.context.createPullRequestReviewId,
			isConnectedToGitHub: isConnected(state, { name: "github" }),
			isConnectedToGitLab: isConnected(state, { name: "gitlab" }),
			isConnectedToGitHubEnterprise: isConnected(state, { name: "github_enterprise" }),
			isConnectedToGitLabEnterprise: isConnected(state, { name: "gitlab_enterprise" }),
			isConnectedToBitbucket: isConnected(state, { name: "bitbucket" }),
			isConnectedToBitbucketServer: isConnected(state, { name: "bitbucket_server" }),
			prLabel: getPRLabel(state)
		};
	});
	const { userStatus, reviewId, prLabel } = derivedState;

	const [loading, setLoading] = useState(true);
	const [loadingBranchInfo, setLoadingBranchInfo] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [preconditionError, setPreconditionError] = useState({
		message: "",
		type: "",
		url: "",
		id: ""
	});
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

	const stopWaiting = useCallback(() => {
		setIsWaiting(false);
	}, [isWaiting]);

	const waitFor = inMillis(60, "sec");
	useTimeout(stopWaiting, waitFor);

	const fetchPreconditionData = async () => {
		setFormState({ type: "", message: "", url: "", id: "" });
		setPreconditionError({ type: "", message: "", url: "", id: "" });
		// already waiting on a provider auth, keep using that loading ui
		if (currentStep != 2) {
			setLoading(true);
			setCurrentStep(0);
		}

		try {
			const args = { reviewId: derivedState.reviewId, repoId: "", headRefName: "" };
			if (!derivedState.reviewId) {
				// if we're not creating a PR from a review, then get the current
				// repo and branch from the editor
				const response = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true
				});

				if (response && response.repositories) {
					setOpenRepos(response.repositories);
					if (!selectedRepo) setSelectedRepo(response.repositories[0]);
					args.repoId = (selectedRepo || response.repositories[0]).id || "";
					setPrRepoId(args.repoId);

					let branchInfo = await HostApi.instance.send(GetBranchesRequestType, {
						uri: (selectedRepo || response.repositories[0]).folder.uri
					});
					if (branchInfo && branchInfo.scm && branchInfo.scm.current) {
						args.headRefName = branchInfo.scm.current;
					}
					// FIXME if we kept track of the fork point, pass in the args.baseRefName here
				}
			}
			const result = await HostApi.instance.send(CheckPullRequestPreconditionsRequestType, args);
			if (result && result.success) {
				setReviewBranch(result.branch!);
				setBranches(result.branches!);
				setRemoteBranches(result.remoteBranches!);
				if (result.pullRequestProvider && result.pullRequestProvider.defaultBranch) {
					setPrBranch(result.pullRequestProvider.defaultBranch!);
				}

				setPrRemoteUrl(result.remoteUrl!);
				setPrTitle(result.review!.title!);

				const template = result.pullRequestTemplate || "";
				setNumLines(template.split("\n").length);
				let newText = result.pullRequestTemplate || "";
				if (result.review && result.review.text) newText += result.review.text;
				if (!prTextTouched) setPrText(newText);

				setPrProviderId(result.providerId!);

				setCurrentStep(3);
				if (result.warning && result.warning.type) {
					if (result.warning.type === "REQUIRES_UPSTREAM") {
						setRequiresUpstream(true);
						setOrigins(result.origins!);
						setPrUpstream(result.origins![0]);
					} else {
						setPreconditionError({
							type: result.warning.type,
							message: result.warning.message || "",
							url: result.warning.url || "",
							id: result.warning.id || ""
						});
					}
				} else if (
					result.pullRequestProvider &&
					result.pullRequestProvider.defaultBranch === result.branch
				) {
					setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
					setFormState({ type: "", message: "", url: "", id: "" });
				} else {
					setPreconditionError({ type: "", message: "", url: "", id: "" });
				}
			} else if (result && result.error && result.error.type) {
				if (result.error.type === "REQUIRES_PROVIDER") {
					setCurrentStep(1);
				} else {
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

	useEffect(() => {
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
		fetchPreconditionData();

		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (pauseDataNotifications.current) return;
			if (e.type === ChangeDataType.Commits) {
				fetchPreconditionData();
			}
		});
		return () => {
			disposable.dispose();
		};
	}, []);

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
		onValidityChanged("title", isTitleValid(prTitle));
		if (!titleValidity) return;

		let success = false;
		setSubmitting(true);
		setFormState({ message: "", type: "", url: "", id: "" });
		setPreconditionError({ message: "", type: "", url: "", id: "" });
		try {
			const result = await HostApi.instance.send(CreatePullRequestRequestType, {
				reviewId: derivedState.reviewId!,
				repoId: prRepoId,
				providerId: prProviderId,
				title: prTitle,
				description: prText,
				baseRefName: prBranch,
				headRefName: reviewBranch,
				remote: prRemoteUrl,
				remoteName: prUpstreamOn && prUpstream ? prUpstream : undefined,
				addresses: addressesStatus
					? [{ title: userStatus.label, url: userStatus.ticketUrl }]
					: undefined
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
					Service: prProviderId
				});
				success = true;
				setFormState({ message: "", type: "", url: "", id: "" });
				if (result.id && (prProviderId === "github*com" || prProviderId === "github/enterprise")) {
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
			await dispatch(clearMyPullRequests(prProviderId));
		}
	};

	const checkPullRequestBranchPreconditions = async (localPrBranch, localReviewBranch) => {
		if (localPrBranch === localReviewBranch) {
			setPreconditionError({ type: "BRANCHES_MUST_NOT_MATCH", message: "", url: "", id: "" });
			setFormState({ type: "", message: "", url: "", id: "" });
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
					inEditorOnly: true
				});

				if (response && response.repositories) {
					repoId = response.repositories[0].id || "";
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
				setFormState({ type: "", message: "", url: "", id: "" });
				console.warn("RESULT IS: ", result);
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
					setPreconditionError({
						type: result.warning.type || "UNKNOWN",
						message: result.warning.message || "Unknown error.",
						url: result.warning.url || "",
						id: result.warning.id || ""
					});
				} else {
					setFormState({ type: "", message: "", url: "", id: "" });
				}
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

	// useEffect(() => {
	// checkPullRequestBranchPreconditions();
	// }, [prBranch, reviewBranch]);

	const renderBaseBranchesDropdown = () => {
		const items = remoteBranches!.map(_ => {
			return {
				label: _,
				key: _,
				action: async () => {
					setPrBranch(_);
					checkPullRequestBranchPreconditions(_, reviewBranch);
				}
			};
		});
		if (items.length === 0) return undefined;
		return (
			<span>
				<DropdownButton variant="secondary" items={items}>
					<span className="subtle">base:</span> <strong>{prBranch || reviewBranch}</strong>
				</DropdownButton>
			</span>
		);
	};

	const renderCompareBranchesDropdown = () => {
		const items = branches!.map(_ => {
			return {
				label: _,
				key: _,
				action: async () => {
					setReviewBranch(_);
					checkPullRequestBranchPreconditions(prBranch, _);
				}
			};
		});
		if (items.length === 0) return undefined;
		return (
			<DropdownButton variant="secondary" items={items}>
				<span className="subtle">compare:</span> <strong>{reviewBranch}</strong>
			</DropdownButton>
		);
	};

	const renderReposDropdown = () => {
		const items = openRepos!.map(_ => {
			const repoName = _.id && derivedState.repos[_.id] ? derivedState.repos[_.id].name : _.path;
			return {
				label: repoName,
				key: _.folder.uri,
				action: async () => {
					// optimistically
					// setPrBranch(_);
					setSelectedRepo(_);
				}
			};
		});
		if (items.length === 0) return undefined;
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
			const { name, isEnterprise, host, needsConfigure, forEnterprise } = provider;
			const display = PROVIDER_MAPPINGS[name];
			if (!display) return null;

			const displayHost = renderDisplayHost(host);
			const displayName = isEnterprise
				? `${display.displayName} - ${displayHost}`
				: display.displayName;
			let action;
			if (needsConfigure) {
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
			let preconditionErrorMessageElement = getErrorElement(
				preconditionError.type,
				preconditionError.message,
				preconditionError.url,
				preconditionError.id
			);
			if (preconditionErrorMessageElement) {
				return (
					<PRError>
						<Icon name="alert" /> {preconditionErrorMessageElement}
					</PRError>
				);
			}
		}
		return undefined;
	};

	const formErrorMessages = () => {
		if (!formState || !formState.type) return undefined;

		let formErrorMessageElement = getErrorElement(
			formState.type,
			formState.message,
			formState.url,
			formState.id
		);
		if (formErrorMessageElement) {
			return (
				<PRError>
					<Icon name="alert" /> {formErrorMessageElement}
				</PRError>
			);
		}
		return undefined;
	};

	const getErrorElement = (type, message, url, id) => {
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
			case "REQUIRES_UPSTREAM": {
				// no message for this
				// we show additional UI for this
				break;
			}
			case "HAS_LOCAL_COMMITS": {
				messageElement = (
					<span>
						A PR can't be created because the code review includes local commits. Push your changes
						and then <Link onClick={onClickTryAgain}>try again</Link>
					</span>
				);
				break;
			}
			case "HAS_LOCAL_MODIFICATIONS": {
				messageElement = (
					<span>
						A PR can't be created because the code review includes uncommitted changes. Commit and
						push your changes and then <Link onClick={onClickTryAgain}>try again</Link>.
					</span>
				);
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
									if (id) {
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

	const fetchFilesChanged = async () => {
		setIsLoadingDiffs(true);
		const response = await HostApi.instance.send(DiffBranchesRequestType, {
			repoId: prRepoId,
			baseRef: prBranch,
			headRef: reviewBranch
		});

		if (response.error) {
			setFilesChanged([]);
		} else if (response && response.filesChanged) {
			setFilesChanged(response.filesChanged);
		}
		setIsLoadingDiffs(false);
	};

	useEffect(() => {
		if (prBranch && reviewBranch) fetchFilesChanged();
		else setFilesChanged([]);
	}, [prBranch, reviewBranch]);

	if (propsForPrePRProviderInfoModal) {
		return <PrePRProviderInfoModal {...propsForPrePRProviderInfoModal} />;
	}
	// console.warn("CURRENT STEP IS: ", currentStep, "PCE: ", preconditionError, "loading: ", loading);
	return (
		<Root className="full-height-codemark-form">
			<PanelHeader title={`Open a ${prLabel.PullRequest}`}>
				{reviewId ? "" : `Choose two branches to start a new ${prLabel.pullrequest}.`}
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
											{openRepos.length > 0 && !reviewId && (
												<PRDropdown>
													<Icon name="repo" />
													{renderReposDropdown()}
												</PRDropdown>
											)}
											<PRDropdown>
												<Icon name="git-compare" />
												{renderBaseBranchesDropdown()}
											</PRDropdown>
											<PRDropdown>
												<Icon name="arrow-left" />
												{renderCompareBranchesDropdown()}
											</PRDropdown>
										</PRCompare>
									</div>
									{loadingBranchInfo && <LoadingMessage>Loading branch info...</LoadingMessage>}
									{(!loading && preconditionError.type) || loadingBranchInfo ? null : (
										<div>
											{false && !titleValidity && (
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
													onValidityChanged={onValidityChanged}
													validate={isTitleValid}
												/>
												<div className="actions">
													{prTitle.length > 0 && (
														<Icon
															name="x"
															placement="top"
															title="Clear Title"
															className="clickable"
															onClick={() => setPrTitle("")}
														/>
													)}
													{userStatus.label && (
														<Icon
															placement="top"
															title="Use Current Ticket"
															name={userStatus.ticketProvider || "ticket"}
															className="clickable"
															onClick={() => setPrTitle(userStatus.label)}
														/>
													)}
													{latestCommit && (
														<Icon
															placement="topRight"
															title="Use Latest Commit Message"
															name="git-commit-vertical"
															className="clickable"
															onClick={() => setPrTitle(latestCommit)}
														/>
													)}
													{reviewBranch && (
														<Icon
															placement="top"
															title="Use Branch Name"
															name="git-branch"
															className="clickable"
															onClick={() => setTitleBasedOnBranch()}
														/>
													)}
												</div>
											</div>
											<div className="control-group">
												<textarea
													className="input-text"
													name="description"
													rows={numLines > 20 ? 20 : numLines}
													value={prText}
													onChange={e => {
														setPrTextTouched(true);
														setPrText(e.target.value);
													}}
													placeholder={`${prLabel.Pullrequest}  description (optional)`}
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
				<PullRequestFilesChangedList
					isLoading={isLoadingDiffs}
					filesChanged={filesChanged}
					baseRef={prBranch}
					headRef={reviewBranch}
					baseRefName={prBranch}
					headRefName={reviewBranch}
				/>
			</span>
		</Root>
	);
};
