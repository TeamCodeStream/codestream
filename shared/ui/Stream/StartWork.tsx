import { logError } from "@codestream/webview/logger";
import { Link } from "@codestream/webview/Stream/Link";
import React, { useState, useEffect, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import Icon from "./Icon";
import { Checkbox } from "../src/components/Checkbox";
import styled from "styled-components";
import { Button } from "../src/components/Button";
import { setUserStatus, setUserPreference, connectProvider } from "./actions";
import { setCurrentCodemark, setStartWorkCard } from "../store/context/actions";
import { CSMe, FileStatus } from "@codestream/protocols/api";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { useDidMount, useRect } from "../utilities/hooks";
import {
	GetBranchesRequestType,
	CreateBranchRequestType,
	SwitchBranchRequestType,
	MoveThirdPartyCardRequestType,
	GetReposScmRequestType,
	ReposScm,
	UpdateThirdPartyStatusRequestType,
	DidChangeDataNotificationType,
	ChangeDataType,
	FetchRemoteBranchRequestType,
	FetchBranchCommitsStatusRequestType
} from "@codestream/protocols/agent";
import { ConfigureBranchNames } from "./ConfigureBranchNames";
import { MarkdownText } from "./MarkdownText";
import {
	getProviderConfig,
	isConnected,
	getConnectedSharingTargets
} from "../store/providers/reducer";
import { SharingAttributes } from "./SharingControls";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { PanelHeader } from "../src/components/PanelHeader";
import ScrollBox from "./ScrollBox";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { ModifiedRepos } from "./ModifiedRepos";
import Tooltip from "./Tooltip";
import { OpenReviews } from "./OpenReviews";
import { OpenPullRequests } from "./OpenPullRequests";
import { Modal } from "./Modal";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { GitTimeline, BranchLineDown, BranchCurve, BranchLineAcross, GitBranch } from "./Flow";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { ButtonRow } from "../src/components/Dialog";
import { ExtensionTitle } from "./Sidebar";
import { ScmError } from "../store/editorContext/reducer";
import { confirmPopup } from "./Confirm";

const StyledCheckbox = styled(Checkbox)`
	color: var(--text-color-subtle);
	margin-bottom: 10px;
`;

const StatusInput = styled.div`
	position: relative;
	margin: 7px 0 20px 0;
	width: 100%;
	.clear {
		position: absolute;
		right: 2px;
		top: 1px;
		padding: 8px 10px;
	}
	input#status-input {
		border: 1px solid var(--base-border-color);
		font-size: 14px !important;
		// padding: 8px 40px 8px 42px !important;
		padding: 8px 40px 8px 10px !important;
		width: 100%;
		&::placeholder {
			font-size: 14px !important;
		}
	}
`;

const CardTitle = styled.span`
	font-size: 16px;
	position: relative;
	padding-left: 28px;
	padding-right: 28px;
	line-height: 20px;
	display: inline-block;
	width: 100%;
	.icon,
	.ticket-icon {
		margin-left: -28px;
		display: inline-block;
		transform: scale(1.25);
		padding: 0 8px 0 3px;
		vertical-align: -2px;
	}
	& + & {
		margin-left: 20px;
	}
	.link-to-ticket {
		position: absolute;
		top: 0;
		right: 0;
		.icon {
			padding-right: 0;
			margin-left: 0;
		}
	}
`;

const MonoMenu = styled(InlineMenu)`
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: normal;
	> .icon {
		margin-right: 5px;
	}
`;

const SCMError = styled.div`
	margin: 20px 0 0 0;
	font-size: smaller;
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: pre-wrap;
	color: var(--font-color-highlight);
`;

const CardDescription = styled.div`
	// padding: 10px;
	// border: 1px solid var(--base-border-color);
	margin: -5px 0 20px 28px;
	// background: var(--app-background-color);
`;

const CardLink = styled.div`
	text-align: right;
	font-size: smaller;
	margin: -18px 0 15px 0;
`;

export const HeaderLink = styled.span`
	float: right;
	cursor: pointer;
	.icon {
		opacity: 0.7;
		&:hover {
			opacity: 1;
		}
	}
	display: none;
	.narrow-icon {
		margin-right: 5px;
	}
	padding: 0px 5px;
`;

export const StatusSection = styled.div`
	padding: 30px 0 5px 0;
	.icon {
		margin-right: 5px;
		&.ticket,
		&.link-external {
			margin-right: 0;
		}
	}
	border-bottom: 1px solid var(--base-border-color);
	.instructions {
		display: none;
		padding: 0 20px 20px 20px;
		text-align: center;
	}
	&.show-instructions .instructions {
		display: block;
	}
	&:hover ${HeaderLink} {
		display: inline;
	}
`;

// @ts-ignore
export const WideStatusSection = styled(StatusSection)`
	padding-left: 0;
	padding-right: 0;
`;

export const H4 = styled.h4`
	// position: fixed;
	color: var(--text-color-highlight);
	// font-weight: 600;
	// font-size: 11px;
	// text-transform: uppercase;
	// margin: -25px 0 5px 0;
	// padding-left: 20px;
	.toggle {
		opacity: 0;
		margin: 0 5px 0 -13px;
		vertical-align: -1px;
		transition: opacity 0.1s;
	}
	&:hover .toggle {
		opacity: 1;
	}
`;

export const RoundedSearchLink = styled(HeaderLink)`
	padding: 3px 3px 3px 3px;
	&.collapsed {
		padding: 3px 4px 3px 4px;
	}
	.icon {
		margin-right: 0;
	}
	display: flex;
	.accordion {
		display: inline-block;
		width: 130px;
		transition: width 0.1s;
		overflow: hidden;
		white-space: nowrap;
		height: 16px;
		line-height: 16px;
		margin: 0;
		#search-input {
			width: 90px;
			background: transparent !important;
			font-size: 13px !important;
			padding: 0 5px !important;
			margin: 0 0 !important;
			&:focus {
				outline: none;
			}
		}
		.icon {
			float: right;
			vertical-align: -1px;
			margin-right: 4px;
		}
	}
	&.collapsed .accordion {
		width: 0;
	}
`;

const HR = styled.div`
	border-top: 1px solid var(--base-border-color);
	margin: 0 0 20px 0;
`;

const BranchDiagram = styled.div`
	transition: max-height 0.2s, opacity 0.4s;
	max-height: 400px;
	height: auto;
	overflow: hidden;
	&.closed {
		max-height: 0;
		opacity: 0;
	}
	margin: 0 0 0 30px;
	// background: #000;
	position: relative;
	${GitTimeline} {
		width: 100px;
		&:after {
			display: none;
		}
		transition: all 0.2s;
	}
	${GitBranch} {
		margin-left: -20px;
		transition: all 0.2s;
	}
	${BranchLineDown} {
		margin-left: -20px;
		top: 50px;
		bottom: 51px;
		height: auto;
		transition: all 0.2s;
	}
	${BranchLineAcross} {
		margin-left: -20px;
		width: 25px;
    	top: auto;
    	bottom: 28px;		
		transition: all 0.2s;
	}
	${BranchCurve} {
		margin-left: -20px;
		top: auto;
		bottom: 28px;
		transition: all 0.2s;
	}
	.pull-option {	
		margin: 5px 0;
	}
	.branch-info {
		margin-left: 110px;
		position: relative;
    	padding: 0;
	}
	.base-branch {
		transition: all 0.2s;
		margin-top: 20px;
		min-height: 50px;
		.change-base-branch {
			margin: 5px 0;
		}
	}
	.local-branch {
		transition: all 0.2s;
		margin-bottom: 20px;
	}
	@media only screen and (max-width: 430px) {
		${GitTimeline} {
			top: 9px;
			width: 30px;
			left: 0;
		}
		${GitBranch} {
			margin-left: 0;
			left: 10px;
			top: 5px;
			.icon {
				display: none;
			}
			width: 10px;
			height: 10px;
			&:before {
				width: 4px;
				height: 4px;
				top: 3px;
				left: 3px;
			}
		}
		${BranchLineDown} {
			margin-left: 0;
			left: 13px;
			top: 15px;
			bottom: 38px;
			height: auto;
		}
		${BranchLineAcross} {
			margin-left: 0;
			width: 10px;
			left: 20px;
		}
		${BranchCurve} {
			margin-left: 0;
			width: 20px;
			height: 20px;
			left: 13px;
		}
		.branch-info {
			margin-left: 40px;
		}		
		.base-branch {
			margin-top: 0;
		}
		x.local-branch {
			bottom: 0;
		}
	}	
}
`;

const Priority = styled.div`
	// margin: 5px 0;
	margin: -5px 0 20px 28px;
	img {
		width: 16px;
		height: 16px;
		margin-left: 5px;
		transform: scale(1.25);
		vertical-align: -2px;
	}
`;

export const EMPTY_STATUS = {
	label: "",
	ticketId: "",
	ticketUrl: "",
	ticketProvider: "",
	invisible: false
};

const EMPTY_ARRAY = [];

interface Props {
	card: any;
	onClose: (e?: any) => void;
}

export const StartWork = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const teamId = state.context.currentTeamId;
		let status =
			currentUser.status && currentUser.status[teamId] && "label" in currentUser.status[teamId]
				? currentUser.status[teamId]
				: EMPTY_STATUS;
		// const now = new Date().getTime();
		// if (status.expires && status.expires < now) status = EMPTY_STATUS;
		const team = state.teams[teamId];
		const settings = team.settings || {};
		const { preferences = {} } = state;
		const workPrefs = preferences["startWork"] || {};

		const currentTeamId = state.context.currentTeamId;
		const preferencesForTeam = state.preferences[currentTeamId] || {};

		// this is what we've persisted in the server as the last selection the user made
		const lastShareAttributes: SharingAttributes | undefined =
			preferencesForTeam.lastShareAttributes;

		const shareTargets = getConnectedSharingTargets(state);
		const selectedShareTarget = shareTargets.find(
			target =>
				target.teamId ===
				(state.context.shareTargetTeamId ||
					(lastShareAttributes && lastShareAttributes.providerTeamId))
		);

		const isConnectedToSlack = isConnected(state, { name: "slack" }, "users.profile:write");
		const updateSlack = Object.keys(workPrefs).includes("updateSlack")
			? workPrefs.updateSlack
			: true;

		const adminIds = team.adminIds || [];
		const defaultBranchTicketTemplate = "feature/{title}";

		const issueReposDefaultBranch = state.preferences.issueReposDefaultBranch || {};

		return {
			status,
			repos: state.repos,
			invisible: status.invisible || false,
			teamName: team.name,
			currentUserId: state.session.userId!,
			currentUserName: state.users[state.session.userId!].username,
			modifiedReposByTeam: currentUser.modifiedRepos
				? currentUser.modifiedRepos[teamId]
				: undefined,
			webviewFocused: state.context.hasFocus,
			textEditorUri: state.editorContext.textEditorUri,
			branchMaxLength: settings.branchMaxLength || 40,
			defaultBranchTicketTemplate,
			branchTicketTemplate: settings.branchTicketTemplate || defaultBranchTicketTemplate,
			branchPreserveCase: settings.branchPreserveCase,
			createBranch: Object.keys(workPrefs).includes("createBranch") ? workPrefs.createBranch : true,
			moveCard: Object.keys(workPrefs).includes("moveCard") ? workPrefs.moveCard : true,
			updateSlack: isConnectedToSlack ? updateSlack : false,
			slackConfig: getProviderConfig(state, "slack"),
			// msTeamsConfig: getProviderConfig(state, "msteams"),
			isConnectedToSlack,
			issueReposDefaultBranch,
			selectedShareTarget: selectedShareTarget || shareTargets[0],
			isCurrentUserAdmin: adminIds.includes(state.session.userId!),
			shareToSlackSupported: isFeatureEnabled(state, "shareStatusToSlack"),
			teamId
		};
	});
	const { card } = props;
	const { status } = derivedState;
	const [loading, setLoading] = useState(false);
	const [scmError, setScmError] = useState("");
	const [label, setLabel] = useState(card.label || "");
	const [loadingSlack, setLoadingSlack] = useState(false);
	const [currentBranch, setCurrentBranch] = useState("");
	const [editingBranch, setEditingBranch] = useState(false);
	const [branches, setBranches] = useState(EMPTY_ARRAY as string[]);
	const [customBranchName, setCustomBranchName] = useState("");
	const [configureBranchNames, setConfigureBranchNames] = useState(false);
	const [openRepos, setOpenRepos] = useState<ReposScm[]>(EMPTY_ARRAY);
	const [repoUri, setRepoUri] = useState("");
	const [currentRepoId, setCurrentRepoId] = useState("");
	const [currentRepoName, setCurrentRepoName] = useState("");
	const [fromBranch, setFromBranch] = useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [commitsBehindOrigin, setCommitsBehindOrigin] = useState(0);
	const [unexpectedPullError, setUnexpectedPullError] = useState("");
	const [pullSubmitting, setPullSubmitting] = useState(false);
	const [isFromBranchDefault, setIsFromBranchDefault] = useState(false);

	const { moveCard, updateSlack, createBranch } = derivedState;

	const setUpdateSlack = value => {
		if (!derivedState.isConnectedToSlack) {
			setLoadingSlack(true);
			dispatch(connectProvider(derivedState.slackConfig!.id, "Status"));
		} else {
			dispatch(setUserPreference(["startWork", "updateSlack"], value));
		}
	};

	const disposables: { dispose(): void }[] = [];

	const toggleEditingBranch = value => {
		setEditingBranch(value);
	};

	useEffect(() => {
		if (editingBranch && !disposables.length) {
			disposables.push(
				KeystrokeDispatcher.withLevel(),
				KeystrokeDispatcher.onKeyDown(
					"Escape",
					event => {
						toggleEditingBranch(false);
					},
					{ source: "StatusPanel.tsx (toggleEditingBranch)", level: -1 }
				)
			);
		} else {
			disposables && disposables.forEach(_ => _.dispose());
		}
	}, [editingBranch]);

	useEffect(() => {
		fetchBranchCommitsStatus();
	}, [fromBranch]);

	const cardDescription = useMemo(() => {
		let description = "";
		if (card && card.body) {
			description = card.body.replace(/\[Open in IDE\].*/, "");
			if (card.provider.id === "github*com" || card.provider.id === "github/enterprise") {
				description = description.replace(/<!--[\s\S]*?-->/, "")
			}
		}
		return description;
	}, [card]);

	const setMoveCard = value => dispatch(setUserPreference(["startWork", "moveCard"], value));
	const setCreateBranch = value =>
		dispatch(setUserPreference(["startWork", "createBranch"], value));

	const handleChangeStatus = value => {
		setLabel(value || "");
	};

	const selectCard = card => {
		// make sure we've got the most up-to-date set of branches
		getBranches();
	};

	const dateToken = () => {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const date = now.getDate();
		return `${year}-${month > 9 ? month : "0" + month}-${date > 9 ? date : "0" + date}`;
	};

	const replaceTicketTokens = (template: string, card, title: string = "") => {
		let tokenId = "";
		let providerToken = "";
		if (card && card.tokenId) {
			tokenId = card.tokenId;
			title = card.title;
			providerToken = card.providerToken;
		}

		const str = template
			.replace(/\{id\}/g, tokenId)
			.replace(/\{username\}/g, derivedState.currentUserName)
			.replace(/\{team\}/g, derivedState.teamName)
			.replace(/\{date\}/g, dateToken())
			.replace(/\{title\}/g, title)
			.replace(/\{provider\}/g, providerToken)
			.replace(/["\\|<>\*\?:]/g, "")
			.trim()
			.replace(/[\s]+/g, "-")
			.substr(0, derivedState.branchMaxLength);

		return derivedState.branchPreserveCase ? str : str.toLowerCase();
	};

	const fetchBranchCommitsStatus = async () => {
		const commitsStatus = await HostApi.instance.send(FetchBranchCommitsStatusRequestType, {
			repoId: currentRepoId,
			branchName: fromBranch || currentBranch
		});

		setCommitsBehindOrigin(+commitsStatus.commitsBehindOrigin);
	};

	const getBranches = async (uri?: string): Promise<{ openRepos?: ReposScm[] }> => {
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true,
			includeProviders: true
		});
		if (response && response.repositories) {
			setOpenRepos(response.repositories);
		}

		if (uri) {
			setRepoUri(uri);
		}

		let branchInfo = await HostApi.instance.send(GetBranchesRequestType, {
			uri: uri || derivedState.textEditorUri || ""
		});

		// didn't find scm info for the current editor URI
		// try to get it from one of the open repos in your editor
		if (!branchInfo.scm || branchInfo.error) {
			if (response.repositories && response.repositories.length) {
				branchInfo = await HostApi.instance.send(GetBranchesRequestType, {
					uri: response.repositories[0].folder.uri
				});
				setRepoUri(response.repositories[0].folder.uri);
			}
		}

		if (branchInfo.scm && !branchInfo.error) {
			let defaultBranch = derivedState.issueReposDefaultBranch[branchInfo.scm.repoId];

			if (
				!defaultBranch ||
				(branchInfo.scm.branches &&
					!branchInfo.scm.branches.some(branchName => branchName === defaultBranch))
			) {
				defaultBranch = branchInfo.scm.current;
				dispatch(
					setUserPreference(["issueReposDefaultBranch"], { [branchInfo.scm.repoId]: defaultBranch })
				);
			}

			setBranches(branchInfo.scm.branches);
			setFromBranch("");
			setCurrentBranch(defaultBranch);
			setCurrentRepoId(branchInfo.scm.repoId);
			const repoId = branchInfo.scm.repoId;
			const repoName = derivedState.repos[repoId] ? derivedState.repos[repoId].name : "repo";
			setCurrentRepoName(repoName);

			const commitsStatus = await HostApi.instance.send(FetchBranchCommitsStatusRequestType, {
				repoId: branchInfo.scm.repoId,
				branchName: defaultBranch
			});

			setCommitsBehindOrigin(+commitsStatus.commitsBehindOrigin);
		}
		return {
			openRepos: response ? response.repositories : []
		};
	};

	useDidMount(() => {
		getBranches();
		if (card.moveCardOptions && card.moveCardOptions.length) {
			const index = card.moveCardOptions.findIndex(option =>
				option.to ? option.to.id === card.idList : option.id === card.idList
			);
			const next = card.moveCardOptions[index + 1];
			if (next) setMoveCardDestination(next);
			else setMoveCardDestination(card.moveCardOptions[0]);
		}

		const disposable = HostApi.instance.on(DidChangeDataNotificationType, async (e: any) => {
			if (e.type === ChangeDataType.Workspace) {
				await getBranches();
			}
		});
		return () => {
			disposable && disposable.dispose();
		};
	});

	const showMoveCardCheckbox = React.useMemo(() => {
		return card && card.moveCardOptions && card.moveCardOptions.length > 0;
	}, [card, label]);
	const showCreateBranchCheckbox = React.useMemo(() => {
		return label && branches && branches.length > 0;
	}, [label, branches]);
	const showUpdateSlackCheckbox = React.useMemo(() => {
		return label && derivedState.shareToSlackSupported;
	}, [label, derivedState.shareToSlackSupported]);

	const newBranch = React.useMemo(() => {
		if (customBranchName) return customBranchName;
		if (card && card.branchName) return card.branchName;
		return (
			replaceTicketTokens(derivedState.branchTicketTemplate, card, label) ||
			replaceTicketTokens(derivedState.defaultBranchTicketTemplate, card, label)
		);
	}, [
		label,
		card,
		customBranchName,
		derivedState.branchTicketTemplate,
		derivedState.branchPreserveCase
	]);

	const branch = React.useMemo(() => {
		if (customBranchName) return customBranchName;
		if (card && card.branchName) return card.branchName;
		return (
			replaceTicketTokens(derivedState.branchTicketTemplate, card, label) ||
			replaceTicketTokens(derivedState.defaultBranchTicketTemplate, card, label)
		);
	}, [
		label,
		card,
		customBranchName,
		derivedState.branchTicketTemplate,
		derivedState.branchPreserveCase
	]);

	const save = async () => {
		setLoading(true);

		const { slackConfig } = derivedState;
		const createTheBranchNow =
			showCreateBranchCheckbox &&
			createBranch &&
			branch.length > 0 &&
			(repoUri || derivedState.textEditorUri);
		const moveTheCardNow = showMoveCardCheckbox && moveCard && card && moveCardDestinationId;
		const updateSlackNow = slackConfig && showUpdateSlackCheckbox && updateSlack;
		try {
			if (createTheBranchNow) {
				const uri = repoUri || derivedState.textEditorUri || "";
				const request = branches.includes(branch)
					? SwitchBranchRequestType
					: CreateBranchRequestType;
				const result = await HostApi.instance.send(request, {
					branch,
					uri,
					fromBranch: fromBranch || currentBranch
				});
				// FIXME handle error
				if (result.error) {
					console.warn("ERROR FROM SET BRANCH: ", result.error);
					setScmError(result.error);
					setLoading(false);
					return;
				}
			}

			if (moveTheCardNow) {
				const response = await HostApi.instance.send(MoveThirdPartyCardRequestType, {
					providerId: card.providerId,
					cardId: card.id,
					listId: moveCardDestinationId
				});
			}

			if (slackConfig && updateSlackNow) {
				const response = await HostApi.instance.send(UpdateThirdPartyStatusRequestType, {
					providerId: slackConfig.id,
					providerTeamId: derivedState.selectedShareTarget.teamId,
					text: "Working on: " + label,
					icon: ":desktop_computer:"
				});
			}
		} catch (e) {
			console.warn("ERROR: " + e);
		} finally {
			HostApi.instance.track("Work Started", {
				"Branch Created": createTheBranchNow,
				"Ticket Selected": card ? card.providerIcon : "",
				"Ticket Moved": moveTheCardNow ? true : false,
				"Status Set": updateSlackNow
			});
		}

		const ticketId = card ? card.id : "";
		const ticketUrl = card ? card.url : "";
		const ticketProvider = card ? card.providerIcon : "";
		await dispatch(
			setUserStatus(
				label,
				ticketId,
				ticketUrl,
				ticketProvider,
				derivedState.invisible,
				derivedState.teamId
			)
		);
		cancel();
	};

	const cancel = () => {
		setLabel("");
		setScmError("");
		setLoadingSlack(false);
		dispatch(setStartWorkCard(undefined));
		props.onClose();
	};

	const clearAndSave = () => {
		setLoadingSlack(false);
		dispatch(setUserStatus("", "", "", "", derivedState.invisible, derivedState.teamId));
		dispatch(setStartWorkCard(undefined));
		// FIXME clear out slack status
	};

	const saveLabel =
		!branch || branch == currentBranch || !createBranch
			? "Start Work"
			: branches.includes(branch)
			? "Switch Branch & Start Work"
			: "Create Branch & Start Work";

	const branchMenuItems = [] as any; //branches.map(branch => makeMenuItem(branch, false)) as any;
	if (newBranch) {
		branchMenuItems.unshift(
			{
				label: "Edit Branch Name",
				key: "edit",
				icon: <Icon name="pencil" />,
				action: () => toggleEditingBranch(true)
			},
			{
				label: "Configure Branch Naming",
				key: "configure",
				icon: <Icon name="gear" />,
				action: () => setConfigureBranchNames(true),
				disabled: !!card.branchName || !derivedState.isCurrentUserAdmin,
				subtext: card.branchName
					? "Disabled: branch name comes from 3rd party card"
					: derivedState.isCurrentUserAdmin
					? ""
					: "Disabled: admin only"
			}
		);
	}

	const baseBranchMenuItems = branches.map(branch => {
		const iconName = branch == currentBranch ? "arrow-right" : "blank";
		return {
			label: <span className="monospace">{branch}</span>,
			key: branch,
			icon: <Icon name={iconName} />,
			action: () => {
				setFromBranch(branch);
				setIsFromBranchDefault(derivedState.issueReposDefaultBranch[currentRepoId] === branch);
			}
		};
	});

	const repoMenuItems = (openRepos || []).map(repo => {
		const repoId = repo.id || "";
		return {
			icon: <Icon name={repo.id === currentRepoId ? "arrow-right" : "blank"} />,
			label: derivedState.repos[repoId] ? derivedState.repos[repoId].name : repo.folder.name,
			key: repo.id,
			action: () => getBranches(repo.folder.uri)
		};
	});

	const setMoveCardDestination = option => {
		setMoveCardDestinationId(option.id);
		setMoveCardDestinationLabel(option.name);
	};

	const [moveCardDestinationId, setMoveCardDestinationId] = React.useState("");
	const [moveCardDestinationLabel, setMoveCardDestinationLabel] = React.useState("");

	const moveCardItems =
		!card || !card.moveCardOptions
			? []
			: card.moveCardOptions.map(option => {
					const selected = option.to ? option.to.id === card.idList : option.id === card.idList;
					return {
						label: option.name,
						icon: <Icon name={selected ? "arrow-right" : "blank"} />,
						key: option.id,
						action: () => setMoveCardDestination(option)
					};
			  });

	const onPullSubmit = async (event: React.SyntheticEvent) => {
		setUnexpectedPullError("");
		setPullSubmitting(true);

		try {
			await HostApi.instance.send(FetchRemoteBranchRequestType, {
				repoId: currentRepoId,
				branchName: fromBranch || currentBranch
			});
			await fetchBranchCommitsStatus();
		} catch (error) {
			logError(error, {});
			logError(`Unexpected error during branch pulling : ${error}`, {});
			confirmPopup({
				title: "Git Error",
				message: (
					<div style={{ fontSize: "13px" }}>
						<FormattedMessage
							id="error.unexpected"
							defaultMessage="Something went wrong. Please try again, or pull origin manually."
						/>{" "}
						<SCMError>{error}</SCMError>
					</div>
				),
				buttons: [
					{ label: "Close", className: "control-button" },
					{
						label: "Contact Support",
						action: () => {
							HostApi.instance.send(OpenUrlRequestType, { url: "https://docs.newrelic.com/docs/codestream/" });
						}
					}
				]
			});
			// setUnexpectedPullError(error);
		} finally {
			setPullSubmitting(false);
		}
	};

	return (
		<>
			{configureBranchNames && (
				<Modal translucent verticallyCenter>
					<ConfigureBranchNames onClose={() => setConfigureBranchNames(false)} />
				</Modal>
			)}
			{card && (
				<Modal translucent onClose={cancel}>
					<Dialog className="codemark-form-container">
						<div className="codemark-form standard-form vscroll">
							<fieldset className="form-body" style={{ padding: "0px" }}>
								<div id="controls">
									<StatusInput>
										{card.id ? (
											<CardTitle>
												{card.typeIcon ? (
													<img className="ticket-icon" src={card.typeIcon} />
												) : card.providerIcon ? (
													<Icon className="ticket-icon" name={card.providerIcon} />
												) : null}
												{card.label || card.title}
												{card.url && (
													<div
														className="link-to-ticket"
														onClick={() =>
															HostApi.instance.send(OpenUrlRequestType, {
																url: card.url
															})
														}
													>
														<Icon title="Open on web" className="clickable" name="globe" />
													</div>
												)}
												{card.providerId === "codestream" && (
													<div
														className="link-to-ticket"
														onClick={e => {
															cancel();
															dispatch(setCurrentCodemark(card.id));
														}}
													>
														<Icon className="clickable" name="description" />
													</div>
												)}
											</CardTitle>
										) : (
											<>
												<h3>What are you working on?</h3>
												<input
													id="status-input"
													ref={inputRef}
													name="status"
													value={label}
													className="input-text control"
													autoFocus={true}
													type="text"
													onChange={e => handleChangeStatus(e.target.value)}
													placeholder="Enter Description"
													onKeyDown={e => {
														if (e.key == "Escape") cancel();
														if (e.key == "Enter") save();
													}}
												/>
											</>
										)}
									</StatusInput>
									{(card.priorityName || card.priorityIcon) && (
										<Priority>
											<b>Priority: </b>
											{card.priorityName}
											{card.priorityIcon && <img src={card.priorityIcon} />}
										</Priority>
									)}
									{card && card.body && (
										<CardDescription>
											<MarkdownText text={cardDescription} />
										</CardDescription>
									)}
									{card && card.title && <HR />}
									{showMoveCardCheckbox && (
										<StyledCheckbox
											name="move-issue"
											checked={moveCard}
											onChange={v => setMoveCard(v)}
										>
											{card && card.moveCardLabel}{" "}
											<InlineMenu items={moveCardItems}>
												{moveCardDestinationLabel || "make selection"}
											</InlineMenu>
										</StyledCheckbox>
									)}
									{showCreateBranchCheckbox && (
										<>
											<StyledCheckbox
												name="create-branch"
												checked={createBranch}
												onChange={v => setCreateBranch(v)}
											>
												Set up a branch in{" "}
												<span style={{ whiteSpace: "nowrap" }}>
													<MonoMenu items={repoMenuItems}>
														<span style={{ whiteSpace: "nowrap" }}>
															<Icon name="repo" />
															{currentRepoName}
														</span>
													</MonoMenu>
												</span>
											</StyledCheckbox>
											<BranchDiagram className={createBranch ? "open" : "closed"}>
												<GitTimeline />
												<BranchLineDown />
												<BranchCurve />
												<BranchLineAcross />
												<GitBranch className="no-hover">
													<Icon name="git-branch" />
												</GitBranch>
												<div className="branch-info">
													<div className="base-branch">
														<MonoMenu items={baseBranchMenuItems}>
															<Tooltip title="Base Branch" align={{ offset: [15, 0] }}>
																<span>{fromBranch || currentBranch}</span>
															</Tooltip>
														</MonoMenu>
														{commitsBehindOrigin > 0 && (
															<div className="pull-option">
																<Icon name="info" /> {commitsBehindOrigin} commit
																{commitsBehindOrigin > 1 ? "s" : ""} behind origin{" "}
																<Button
																	size="subcompact"
																	onClick={onPullSubmit}
																	isLoading={pullSubmitting}
																>
																	Pull
																</Button>
															</div>
														)}
														{fromBranch && (
															<StyledCheckbox
																className="change-base-branch"
																name="change-base-branch-request"
																checked={isFromBranchDefault}
																onChange={value => {
																	const isBranchDefault = !isFromBranchDefault;
																	setIsFromBranchDefault(isBranchDefault);
																	dispatch(
																		setUserPreference(["issueReposDefaultBranch"], {
																			[currentRepoId]: isBranchDefault ? fromBranch : ""
																		})
																	);
																	setCurrentBranch(fromBranch);
																}}
															>
																Always use{" "}
																<span className="monospace highlight">
																	{fromBranch || currentBranch}
																</span>{" "}
																as base branch
															</StyledCheckbox>
														)}
													</div>
													<div className="local-branch">
														{editingBranch ? (
															<input
																id="branch-input"
																name="branch"
																value={customBranchName || branch}
																className="input-text control"
																autoFocus={true}
																type="text"
																onChange={e => setCustomBranchName(e.target.value)}
																placeholder="Enter branch name"
																onBlur={() => toggleEditingBranch(false)}
																onKeyPress={e => {
																	if (e.key == "Enter") toggleEditingBranch(false);
																}}
																style={{ width: "200px" }}
															/>
														) : (
															<MonoMenu items={branchMenuItems}>
																<Tooltip title="Local Branch" align={{ offset: [15, 0] }}>
																	<span>{branch}</span>
																</Tooltip>
															</MonoMenu>
														)}
													</div>
												</div>
											</BranchDiagram>
										</>
									)}
									{showUpdateSlackCheckbox && (
										<StyledCheckbox
											name="update-slack"
											checked={updateSlack}
											loading={loadingSlack && !derivedState.isConnectedToSlack}
											onChange={v => setUpdateSlack(v)}
										>
											Update my status on Slack
										</StyledCheckbox>
									)}
									<div style={{ height: "5px" }}></div>
									{scmError && <SCMError>{scmError}</SCMError>}
									<ButtonRow>
										<Button onClick={cancel} variant="secondary">
											Cancel
										</Button>
										<Button
											onClick={save}
											isLoading={loading}
											variant={label.length ? "primary" : "secondary"}
											disabled={!label.length}
										>
											{saveLabel}
										</Button>
									</ButtonRow>
								</div>
							</fieldset>
						</div>
					</Dialog>
				</Modal>
			)}
		</>
	);
};

const Dialog = styled.div`
	padding: 5px 5px 15px 5px;
	text-align: left;
	// max-width: 500px;
	width: 100%;
	margin: 0 auto;
	display: inline-block;
`;
