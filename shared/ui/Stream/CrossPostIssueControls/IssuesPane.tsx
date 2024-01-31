import {
	FetchThirdPartyCardsRequestType,
	ThirdPartyProviderCard,
	ThirdPartyProviderConfig,
	TransitionsEntity,
} from "@codestream/protocols/agent";
import { CSMe, CSTeamSettings } from "@codestream/protocols/api";
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { WebviewPanels } from "@codestream/protocols/api";
import { Button } from "@codestream/webview/src/components/Button";
import { ButtonRow, Dialog } from "@codestream/webview/src/components/Dialog";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { PaneBody, PaneHeader, PaneState } from "@codestream/webview/src/components/Pane";
import { CodeStreamState } from "@codestream/webview/store";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { fetchBoardsAndCardsAction } from "@codestream/webview/store/activeIntegrations/thunks";
import {
	useAppDispatch,
	useAppSelector,
	useDidMount,
	useInterval,
	usePrevious,
} from "@codestream/webview/utilities/hooks";
import { keyFilter, mapFilter } from "@codestream/webview/utils";
import { HostApi } from "@codestream/webview/webview-api";
import * as codemarkSelectors from "../../store/codemarks/reducer";
import {
	openPanel,
	setCurrentCodemark,
	setIssueProvider,
	setNewPostEntry,
} from "../../store/context/actions";
import { configureAndConnectProvider } from "../../store/providers/actions";
import { getUserProviderInfo } from "../../store/providers/utils";
import { setUserPreference, setUserStatus } from "../actions";
import { ErrorMessage } from "../ConfigurePullRequestQuery";
import Filter from "../Filter";
import Icon from "../Icon";
import { IntegrationButtons, Provider } from "../IntegrationsPanel";
import { Link } from "../Link";
import Menu from "../Menu";
import { Modal } from "../Modal";
import { PrePRProviderInfoModal, PrePRProviderInfoModalProps } from "../PrePRProviderInfoModal";
import { SmartFormattedList } from "../SmartFormattedList";
import { EMPTY_STATUS, StartWork } from "../StartWork";
import Tooltip from "../Tooltip";
import { ProviderDisplay, PROVIDER_MAPPINGS } from "./types";
import { IssuesLoading } from "@codestream/webview/Stream/IssuesLoading";
interface FetchCardError {
	provider: string;
	error: string;
}

interface ProviderInfo {
	provider: ThirdPartyProviderConfig;
	display: ProviderDisplay;
}

interface ThirdPartyProviderBase extends Pick<ThirdPartyProviderConfig, "id" | "name"> {}

/*
ThirdPartyProviderCard enhanced with extra fields for the UI
 */
export interface CardView extends ThirdPartyProviderCard {
	providerIcon?: string;
	icon?: JSX.Element;
	providerToken?: string;
	providerName?: string;
	providerId?: string;
	moveCardLabel?: string;
	idList?: string;
	branchName?: string;
	body: string;
	moveCardOptions?: TransitionsEntity[];
	provider: ThirdPartyProviderBase;
	key: string;
}

interface Props {
	isEditing?: boolean;
	paneState?: PaneState;
}

export default function IssuesPane(props: Props) {
	const dispatch = useAppDispatch();

	const [isLoading, setLoading] = useState(false);
	const [issueProviderMenuOpen, setIssueProviderMenuOpen] = useState(false);
	const [issueProviderMenuTarget, setIssueProviderMenuTarget] = useState(undefined);
	const [propsForPrePRProviderInfoModal, setPropsForPrePRProviderInfoModal] = useState<
		PrePRProviderInfoModalProps | undefined
	>(undefined);
	const [loadingProvider, setLoadingProvider] = useState<ProviderInfo | undefined>(undefined);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { users, teams, session, context, providers, preferences, configs } = state;
		const currentIssueProviderConfig = context.issueProvider
			? providers[context.issueProvider]
			: undefined;
		const workPreferences = preferences.startWork || EMPTY_HASH;
		const team = teams[context.currentTeamId];
		const teamSettings: CSTeamSettings = team.settings || EMPTY_HASH;

		const knownIssueProviders: string[] =
			!providers || !Object.keys(providers).length
				? []
				: Object.keys(providers).filter(providerId => {
						const provider = providers![providerId];
						return provider.hasIssues && !!PROVIDER_MAPPINGS[provider.name];
				  });

		return {
			currentUser: users[session.userId!] as CSMe,
			currentTeamId: context.currentTeamId,
			teamSettings,
			providers,
			issueProviderConfig: currentIssueProviderConfig,
			disabledProviders: workPreferences.disabledProviders || EMPTY_HASH,
			isOnPrem: configs.isOnPrem,
			knownIssueProviders,
		};
	});

	const getProviderInfo = (providerId: string): ProviderInfo | undefined => {
		const provider = derivedState.providers ? derivedState.providers[providerId] : undefined;
		if (!provider) return undefined;
		const display = provider ? PROVIDER_MAPPINGS[provider.name] : undefined;
		if (!display) return undefined;
		let providerInfo = getUserProviderInfo(
			derivedState.currentUser,
			provider.name,
			derivedState.currentTeamId
		);
		if (!providerInfo) return;
		if (providerInfo.accessToken) return { provider, display };
		if (!provider.isEnterprise) return undefined;
		if (!providerInfo!.hosts) return undefined;
		providerInfo = providerInfo!.hosts[provider.id];
		if (!providerInfo) return undefined;
		return { provider, display };
	};

	useDidMount(() => {
		const { issueProviderConfig } = derivedState;
		const providerInfo = issueProviderConfig ? getProviderInfo(issueProviderConfig.id) : undefined;
		if (!issueProviderConfig || !providerInfo) {
			dispatch(setIssueProvider(undefined));
		}

		setLoadingProvider(
			derivedState.issueProviderConfig
				? getProviderInfo(derivedState.issueProviderConfig.id)
				: undefined
		);
	});

	const prevState = usePrevious({ issueProviderConfig: derivedState.issueProviderConfig });

	useEffect(() => {
		const { issueProviderConfig } = derivedState;
		const providerInfo = issueProviderConfig ? getProviderInfo(issueProviderConfig.id) : undefined;
		const prevIssueProviderConfig = prevState?.issueProviderConfig;
		if (
			providerInfo &&
			issueProviderConfig &&
			(!prevIssueProviderConfig || prevIssueProviderConfig.id !== issueProviderConfig.id)
		) {
			setLoading(false);
		} else if (!providerInfo && prevIssueProviderConfig) {
			if (isLoading) {
				setLoading(false);
				setLoadingProvider(undefined);
			}
		}
	}, [derivedState.issueProviderConfig]);

	const renderLoading = () => {
		if (!isLoading) return null;

		return (
			<LoadingMessage align="left">
				Authenticating with {loadingProvider!.display.displayName}... (check your web browser){" "}
				<a onClick={cancelLoading}>cancel</a>
			</LoadingMessage>
		);
	};

	const cancelLoading = () => {
		setLoading(false);
		dispatch(setIssueProvider(undefined));
	};

	const renderProviderOptions = (selectedProvider, knownIssueProviderOptions) => {
		return (
			<span className="dropdown-button" onClick={switchIssueProvider}>
				<Icon name="chevron-down" />
				{issueProviderMenuOpen && (
					<Menu
						align="dropdownRight"
						target={issueProviderMenuTarget}
						items={knownIssueProviderOptions}
						action={() => {}}
					/>
				)}
			</span>
		);
	};

	const switchIssueProvider = (event: React.SyntheticEvent) => {
		if (props.isEditing) return;

		event.stopPropagation();
		const target = event.target;
		setIssueProviderMenuOpen(!issueProviderMenuOpen);
		// @ts-ignore
		setIssueProviderMenuTarget(target.closest(".dropdown-button"));
	};

	const providerIsDisabled = providerId => {
		return derivedState.disabledProviders[providerId];
	};

	const providerIsConnected = (providerId: string): boolean => {
		const provider = derivedState.providers ? derivedState.providers[providerId] : undefined;
		const { currentUser } = derivedState;
		if (!provider || currentUser.providerInfo == null) return false;
		let providerInfo = getUserProviderInfo(currentUser, provider.name, derivedState.currentTeamId);
		if (!providerInfo) return false;
		if (providerInfo.accessToken) return true;
		if (!provider.isEnterprise) return false;
		if (!providerInfo.hosts) return false;
		providerInfo = providerInfo.hosts[provider.id];
		return providerInfo && providerInfo.accessToken ? true : false;
	};

	const selectIssueProvider = providerId => {
		setIssueProviderMenuOpen(false);
		if (!providerId) {
			return;
		}
		if (providerId === "codestream") {
			dispatch(setIssueProvider(undefined));
			return;
		}

		// if (setUserPreference) setUserPreference({ prefPath: ["skipConnectIssueProviders"], value: false });

		if (providerIsDisabled(providerId)) {
			// if it's disabled, enable it
			dispatch(
				setUserPreference({
					prefPath: ["startWork", "disabledProviders", providerId],
					value: false,
				})
			);
		} else if (providerIsConnected(providerId)) {
			// if it's conected and not disabled, disable it
			dispatch(
				setUserPreference({ prefPath: ["startWork", "disabledProviders", providerId], value: true })
			);
			// setUserPreference({ prefPath: ["skipConnectIssueProviders"], value: false });
		} else {
			// otherwise we need to connect
			const issueProvider = derivedState.providers![providerId];
			const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
			onChangeProvider({ provider: issueProvider, display: providerDisplay });
		}
	};

	const onChangeProvider = async (providerInfo: ProviderInfo) => {
		await dispatch(configureAndConnectProvider(providerInfo.provider.id, "Compose Modal"));

		/*
		// Per https://newrelic.atlassian.net/browse/CDSTRM-1591, the need for the "pre-PR" modal
		// is discontinued ... if we bring it back, suggest we figure out a way not to repeat the
		// logic below across all our launch integration points - Colin

		if (
			(providerInfo.provider.needsConfigure ||
				(providerInfo.provider.needsConfigureForOnPrem && derivedState.isOnPrem)) &&
			!providerIsConnected(providerInfo.provider.id)
		) {
			const { name, id } = providerInfo.provider;
			dispatch(openPanel(`configure-provider-${name}-${id}-Compose Modal`));
		} else if (
			providerInfo.provider.forEnterprise &&
			!providerIsConnected(providerInfo.provider.id)
		) {
			const { name, id } = providerInfo.provider;
			// if (name === "github_enterprise") {
			//	this.setState({
			//		propsForPrePRProviderInfoModal: {
			//		providerName: name,
			//		onClose: () => this.setState({ propsForPrePRProviderInfoModal: undefined }),
			//		action: () => this.props.openPanel(`configure-enterprise-${name}-${id}`)
			//		}
			//	});
			//	} else
			dispatch(openPanel(`configure-enterprise-${name}-${id}-Issues Section`));
		} else {
			const { name } = providerInfo.provider;
			const { issueProviderConfig } = derivedState;
			const newValueIsNotCurrentProvider =
				issueProviderConfig == undefined || issueProviderConfig.name !== name;
			const newValueIsNotAlreadyConnected =
				!issueProviderConfig || !providerIsConnected(issueProviderConfig.id);
			if (
				newValueIsNotCurrentProvider &&
				newValueIsNotAlreadyConnected &&
				(name === "github" || name === "bitbucket" || name === "gitlab")
			) {
				setPropsForPrePRProviderInfoModal({
					providerName: name,
					onClose: () => {
						setPropsForPrePRProviderInfoModal(undefined);
					},
					action: () => {
						setLoading(true);
						setLoadingProvider(providerInfo);
						dispatch(connectProvider(providerInfo.provider.id, "Issues Section"));
					}
				});
			} else {
				setLoading(true);
				setLoadingProvider(providerInfo);
				dispatch(connectProvider(providerInfo.provider.id, "Issues Section"));
				if (providerIsConnected(providerInfo.provider.id)) {
					setLoading(false);
				}
			}
		}
		*/
	};

	const activeProviders = useMemo(() => {
		const result = derivedState.knownIssueProviders
			.filter(id => providerIsConnected(id) && !providerIsDisabled(id))
			.map(id => derivedState.providers![id]);
		return result;
	}, [
		derivedState.knownIssueProviders,
		derivedState.providers,
		derivedState.currentUser,
		derivedState.currentTeamId,
	]);

	// console.warn("rendering issues...");
	const { issueProviderConfig, teamSettings } = derivedState;

	if (derivedState.knownIssueProviders.length === 0) {
		return null;
	}

	const knownIssueProviderOptions = mapFilter(derivedState.knownIssueProviders, providerId => {
		const issueProvider = derivedState.providers![providerId];
		const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
		const displayName = issueProvider.isEnterprise
			? `${providerDisplay.displayName} - ${issueProvider.host}`
			: providerDisplay.displayName;

		const checked = providerIsConnected(providerId) && !providerIsDisabled(providerId);
		if (!providerDisplay.supportsStartWork) return;
		if (
			teamSettings.limitIssues &&
			!(teamSettings.issuesProviders && teamSettings.issuesProviders[providerId]) &&
			!checked
		)
			return;
		return {
			providerIcon: <Icon name={providerDisplay.icon || "blank"} />,
			checked: checked,
			value: providerId,
			label: displayName,
			key: providerId,
			action: () => selectIssueProvider(providerId),
		};
	}).sort((a, b) => a.label.localeCompare(b.label));
	// const index = knownIssueProviderOptions.findIndex(i => i.disabled);
	// @ts-ignore
	// knownIssueProviderOptions.splice(index, 0, { label: "-" });

	return (
		<>
			{propsForPrePRProviderInfoModal && (
				<PrePRProviderInfoModal {...propsForPrePRProviderInfoModal} />
			)}
			<IssueList
				activeProviders={activeProviders}
				knownIssueProviderOptions={knownIssueProviderOptions}
				loadingMessage={isLoading ? renderLoading() : null}
				paneState={props.paneState}
			/>
		</>
	);
}

interface IssueListProps {
	activeProviders: ThirdPartyProviderConfig[];
	knownIssueProviderOptions: any;
	loadingMessage?: React.ReactNode;
	paneState?: PaneState;
}

const EMPTY_HASH = {};
const EMPTY_CUSTOM_FILTERS = { selected: "", filters: {} };

export const IssueList = React.memo((props: React.PropsWithChildren<IssueListProps>) => {
	const dispatch = useAppDispatch();
	const data = useAppSelector((state: CodeStreamState) => state.activeIntegrations.integrations);
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const startWorkPreferences = preferences.startWork || EMPTY_HASH;
		const skipConnect = preferences.skipConnectIssueProviders;
		const csIssues = codemarkSelectors.getMyOpenIssues(state.codemarks, state.session.userId!);
		const teamId = state.context.currentTeamId;
		const status =
			currentUser.status && currentUser.status[teamId] && "label" in currentUser.status[teamId]
				? currentUser.status[teamId]
				: EMPTY_STATUS;
		const selectedCardId = status.ticketId || "";
		const invisible =
			(currentUser.status && currentUser.status[teamId] && currentUser.status[teamId].invisible) ||
			false;

		const isLoading = state.activeIntegrations.issuesLoading;
		const initialLoadComplete = state.activeIntegrations.initialLoadComplete;
		const activeProviderIds = props.activeProviders.map(provider => provider.id).join(":");

		return {
			csIssues,
			currentUser,
			invisible,
			startWorkCard: state.context.startWorkCard,
			startWorkPreferences,
			selectedCardId,
			skipConnect,
			teamId,
			isLoading,
			initialLoadComplete,
			activeProviderIds,
		};
	});

	const clearAndSave = () => {
		dispatch(setUserStatus("", "", "", "", derivedState.invisible, derivedState.teamId));
	};

	const [isLoadingCard, setIsLoadingCard] = React.useState("");
	const [addingCustomFilterForProvider, setAddingCustomFilterForProvider] = React.useState<
		ThirdPartyProviderConfig | undefined
	>();
	const [newCustomFilter, setNewCustomFilter] = React.useState("");
	const [newCustomFilterName, setNewCustomFilterName] = React.useState("");
	const [reload, setReload] = React.useState(1);
	const [testCards, setTestCards] = React.useState<CardView[] | undefined>(undefined);
	const [loadingTest, setLoadingTest] = React.useState(false);
	const [startWorkCard, setStartWorkCard] = React.useState<CardView | undefined>(undefined);
	const [validGHQueries, setvalidGHQueries] = React.useState(
		new Set([
			"user",
			"org",
			"repo",
			"author",
			"assignee",
			"mentions",
			"team",
			"commenter",
			"involves",
			"reviewed-by",
			"review-requested",
			"team-review-requested",
			"project",
		])
	);
	const [validGLQueries, setvalidGLQueries] = React.useState(
		new Set([
			"project_id",
			"group_id",
			"assignee_username",
			"assignee_id",
			"author_username",
			"author_id",
			"created_by_me",
			"my_reaction_emoji",
			"assigned_to_me",
		])
	);
	const [validQuery, setValidQuery] = React.useState(true);
	const [errorQuery, setErrorQuery] = React.useState(false);

	const getFilterLists = (providerId: string) => {
		const prefs = derivedState.startWorkPreferences[providerId] || {};
		const lists = prefs.filterLists ? { ...prefs.filterLists } : EMPTY_HASH;
		return lists;
	};

	const getFilterBoards = (providerId: string) => {
		const prefs = derivedState.startWorkPreferences[providerId] || {};
		const boards = prefs.filterBoards ? { ...prefs.filterBoards } : EMPTY_HASH;
		return boards;
	};

	// the keys are the filter text (e.g. "assignee:@me milestone:jan")
	// and the values are the optional label that the user created
	const getFilterCustom = (providerId: string) => {
		const prefs = derivedState.startWorkPreferences[providerId] || {};
		const custom =
			prefs.filterCustom && prefs.filterCustom.filters
				? { ...prefs.filterCustom }
				: EMPTY_CUSTOM_FILTERS;
		return custom;
	};

	const codemarkState = useAppSelector((state: CodeStreamState) => state.codemarks);

	useDidMount(() => {
		if (!codemarkState.bootstrapped) {
			// dispatch(bootstrapCodemarks());
		}
		//setup blank data state for provider cards
		props.activeProviders.forEach(provider => {
			updateDataState(provider.id, { cards: [] });
		});
	});

	useEffect(() => {
		const card = derivedState.startWorkCard;
		if (card) selectCard(card);
	}, [derivedState.startWorkCard]);

	const updateDataState = (providerId, data) => dispatch(updateForProvider(providerId, data));

	const setPreference = (providerId, key, value) => {
		dispatch(setUserPreference({ prefPath: ["startWork", providerId, key], value }));
	};

	const fetchData = async (options?: { force?: boolean }) => {
		if (props.activeProviders.length === 0) return;

		try {
			dispatch(fetchBoardsAndCardsAction(props.activeProviders, options?.force));
		} catch (e) {
			console.error(e);
		}
	};

	React.useEffect(() => {
		console.debug("Reloading issues");
		fetchData({ force: true });
	}, [derivedState.activeProviderIds, reload]);

	useInterval(async () => {
		if (!derivedState.isLoading) {
			await fetchData();
		}
	}, 60000);

	const selectCard = React.useCallback(
		async (card: CardView | undefined) => {
			if (card) {
				const { provider } = card;
				if (provider) {
					const providerDisplay = PROVIDER_MAPPINGS[provider.name];
					const pData = data[provider.id] || {};
					const board = pData.boards && pData.boards.find(b => b.id === card.idBoard);
					// console.warn("SETTINGS VALUES: ", pData, card);
					let { idList } = card;
					let moveCardOptions: TransitionsEntity[] = board?.lists ?? [];
					if (providerDisplay.hasCardBasedWorkflow && card.lists && card.lists.length > 0) {
						moveCardOptions = card.lists;
					}
					setStartWorkCard({
						...card,
						providerIcon: provider.id === "codestream" ? "issue" : providerDisplay.icon,
						providerToken: providerDisplay.icon,
						providerName: providerDisplay.displayName,
						providerId: provider.id,
						moveCardLabel: `Move this ${providerDisplay.cardLabel} to`,
						moveCardOptions,
						idList,
					});
				} else {
					// creating a new card/issue
					setStartWorkCard({ ...card });
				}
			} else {
				setStartWorkCard(undefined);
			}
		},
		[reload]
	);

	const filterMenuItemsSubmenu = provider => {
		const filterLists = getFilterLists(provider.id);
		const filterBoards = getFilterBoards(provider.id);
		const filterCustom = getFilterCustom(provider.id);
		const items = [] as any;
		const pData = data[provider.id] || {};

		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		if (providerDisplay.hasCustomFilters) {
			const activeFilters = keyFilter(filterCustom.filters).filter(
				f => typeof filterCustom.filters[f] === "string"
			);
			activeFilters.forEach((filter: any) => {
				if (typeof filterCustom.filters[filter] !== "string") return; // failsafe
				const checked = filterCustom.selected === filter;
				items.push({
					checked,
					label: filterCustom.filters[filter],
					subtext: filterCustom.filters[filter] == filter ? null : filter,
					key: "customer-filter-" + filter,
					action: () => {
						setPreference(provider.id, "filterCustom", { selected: filter });
						setReload(reload + 1);
					},
				});
			});
			if (items.length > 0) {
				items.push({ label: "-" });
			}
			items.push({
				icon: <Icon name="plus" />,
				label: "Create Custom Filter...",
				key: "add-custom",
				action: () => {
					setNewCustomFilterName("");
					setAddingCustomFilterForProvider(provider);
				},
			});
			if (activeFilters.length > 0) {
				items.push({
					icon: <Icon name="trash" />,
					label: "Delete Custom Filter",
					key: "delete-custom",
					submenu: activeFilters.map((filter: any) => {
						return {
							label: filterCustom.filters[filter],
							key: "delete-customer-filter-" + filter,
							action: () => {
								const selected = filterCustom.selected;
								setPreference(provider.id, "filterCustom", {
									filters: { [filter]: false },
									// reset selected if we're deleting the selected one
									selected: selected === filter ? "" : selected,
								});
								if (selected === filter) setReload(reload + 1);
							},
						};
					}),
				});
			}
		}

		if (providerDisplay.hasFilters && pData.boards) {
			if (items.length > 0) {
				items.push({ label: "-" });
			}
			pData.boards.forEach(board => {
				const b = board;
				let boardChecked = false;
				if (board.lists) {
					const submenu = board.lists.map(list => {
						const l = list;
						const checked = !!filterLists[list.id || "_"];
						if (checked) boardChecked = true;
						return {
							label: list.name,
							key: list.id,
							checked,
							action: () =>
								setPreference(provider.id, "filterLists", {
									...filterLists,
									[l.id || "_"]: !checked,
								}),
						};
					});
					items.push({
						label: board.name,
						key: "board-" + board.id,
						checked: boardChecked,
						action: () => {},
						submenu,
					});
				} else {
					const checked = !!filterBoards[b.id];
					// console.warn("GOT: ", checked, " from ", b, " and ", filterBoards);
					items.push({
						label: board.name,
						key: "board-" + board.id,
						checked,
						action: () =>
							setPreference(provider.id, "filterBoards", {
								...filterBoards,
								[b.id || "_"]: !checked,
							}),
					});
				}
			});
		}

		return items;
	};

	const filterMenuItemsForProvider = provider => {
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return {
			label: `${providerDisplay.displayName} Filter`,
			icon: <Icon name={providerDisplay.icon} />,
			key: "filters-" + provider.name,
			submenu: filterMenuItemsSubmenu(provider),
		};
	};

	const { cards, canFilter, cardLabel, selectedLabel, fetchCardErrors } = React.useMemo(() => {
		const items: CardView[] = [];
		const fetchCardErrors: FetchCardError[] = [];
		const numConnectedProviders = props.activeProviders.length;
		let canFilter = false;
		let cardLabel = "issue";
		let selectedLabel = "issues assigned to you";
		props.activeProviders.forEach(provider => {
			const providerDisplay = PROVIDER_MAPPINGS[provider.name];
			canFilter =
				canFilter || providerDisplay.hasFilters || providerDisplay.hasCustomFilters || false;
			if (providerDisplay.cardLabel) cardLabel = providerDisplay.cardLabel;

			const filterLists = getFilterLists(provider.id);
			const isFilteringLists = providerDisplay.hasFilters && keyFilter(filterLists).length > 0;
			const filterBoards = getFilterBoards(provider.id);
			const isFilteringBoards = providerDisplay.hasFilters && keyFilter(filterBoards).length > 0;
			const filterCustom = getFilterCustom(provider.id);
			const isFilteringCustom = providerDisplay.hasCustomFilters && filterCustom.selected;

			if (isFilteringCustom) {
				// if we have more than one connected provider, we don't want
				// the label to be misleading in terms of what you're filtering on
				if (numConnectedProviders > 1) {
					selectedLabel = cardLabel + "s";
				} else if (filterCustom.filters[filterCustom.selected]) {
					selectedLabel = `${filterCustom.filters[filterCustom.selected]}`;
				}
			} else {
				selectedLabel = `${cardLabel}s assigned to you`;
			}

			const pData = data[provider.id] || {};
			const cards = pData?.cards ?? [];

			if (pData.fetchCardsError) {
				const providerDisplay = PROVIDER_MAPPINGS[provider.name];
				fetchCardErrors.push({
					provider: providerDisplay.displayName,
					error: pData.fetchCardsError.message,
				});
			}

			// console.warn("COMPARING: ", cards, " TO ", filterLists);
			items.push(
				...cards
					.filter(card => !isFilteringLists || filterLists[card.idList || "_"])
					.filter(card => !isFilteringBoards || filterBoards[card.idBoard || "_"])
					.map(
						card =>
							({
								...card,
								label: card.title,
								body: card.body,
								icon: <Icon name={providerDisplay.icon} />,
								key: "card-" + card.id,
								provider,
							}) as CardView
					)
			);
		});

		items.push(
			...derivedState.csIssues.map(issue => ({
				id: issue.id,
				label: issue.title,
				body: issue.text,
				title: issue.title,
				modifiedAt: issue.lastActivityAt,
				key: "card-" + issue.id,
				icon: <Icon name="issue" />,
				provider: { id: "codestream", name: "codestream" },
			}))
		);

		items.sort((a, b) => b.modifiedAt - a.modifiedAt);

		return { cards: items, canFilter, cardLabel, selectedLabel, fetchCardErrors };
	}, [
		reload,
		derivedState.startWorkPreferences,
		derivedState.csIssues,
		derivedState.selectedCardId,
	]);

	const menuItems = React.useMemo(() => {
		// if (props.provider.canFilterByAssignees) {
		// 	items.unshift({
		// 		label: "Filter by Assignee",
		// 		icon: <Icon name="filter" />,
		// 		key: "assignment",
		// 		submenu: [
		// 			{
		// 				label: `${derivedState.providerDisplay.cardLabel} Assigned to Me`,
		// 				key: "mine",
		// 				checked: derivedState.filterAssignees === "mine",
		// 				action: () => setPreference("filterAssignees", "mine")
		// 			},
		// 			{
		// 				label: `Unassigned ${derivedState.providerDisplay.cardLabel}`,
		// 				key: "unassigned",
		// 				checked: derivedState.filterAssignees === "unassigned",
		// 				action: () => setPreference("filterAssignees", "unassigned")
		// 			},
		// 			{
		// 				label: `All ${derivedState.providerDisplay.cardLabel}`,
		// 				key: "all",
		// 				checked: derivedState.filterAssignees === "all",
		// 				action: () => setPreference("filterAssignees", "all")
		// 			}
		// 		]
		// 	});
		// }
		// const submenu = [] as any;
		// props.providers.forEach(provider => {
		// 	submenu.push(filterMenuItemsForProvider(provider));
		// });
		// submenu.push(
		// 	{ label: "-" },
		// 	{
		// 		label: "Connect another Service",
		// 		key: "connect",
		// 		submenu: props.knownIssueProviderOptions
		// 	}
		// );

		const items = { filters: [], services: [] } as any;
		props.activeProviders.forEach(provider => {
			const providerDisplay = PROVIDER_MAPPINGS[provider.name];
			if (providerDisplay.hasFilters || providerDisplay.hasCustomFilters) {
				items.filters.unshift(filterMenuItemsForProvider(provider));
			}
		});
		if (items.filters.length === 1) items.filters = items.filters[0].submenu;

		items.services = props.knownIssueProviderOptions;

		return items;
	}, [reload, derivedState.startWorkPreferences, props.knownIssueProviderOptions]);

	const saveCustomFilter = query => {
		if (isValidQuery(query)) {
			const id = addingCustomFilterForProvider ? addingCustomFilterForProvider.id : "";
			setPreference(id, "filterCustom", {
				filters: {
					[newCustomFilter]: newCustomFilterName || newCustomFilter,
				},
				selected: newCustomFilter,
			});
			setReload(reload + 1);
			setAddingCustomFilterForProvider(undefined);
		}
	};

	const isValidQuery = query => {
		if (
			addingCustomFilterForProvider?.id === "github*com" ||
			addingCustomFilterForProvider?.id === "github/enterprise"
		) {
			// Verify if valid query for Github
			const queryStr = query.replace(/:/g, " ").split(/\s+/);
			for (let word of queryStr) {
				if (validGHQueries.has(word)) {
					setValidQuery(true);
					return true;
				}
			}
			setValidQuery(false);
			return false;
		} else if (
			addingCustomFilterForProvider?.id === "gitlab*com" ||
			addingCustomFilterForProvider?.id === "gitlab/enterprise"
		) {
			// Verify if valid query for Gitlab
			const queryStr = query.replace(/[=&]/g, " ").split(/\s+/);
			for (let word of queryStr) {
				if (validGLQueries.has(word)) {
					setValidQuery(true);
					return true;
				}
			}
			setValidQuery(false);
			return false;
		}
		setValidQuery(true);
		return true;
	};

	const testCustomFilter = async query => {
		if (isValidQuery(query)) {
			setTestCards(undefined);
			setLoadingTest(true);
			const id = addingCustomFilterForProvider ? addingCustomFilterForProvider.id : "";
			const response = await HostApi.instance.send(FetchThirdPartyCardsRequestType, {
				customFilter: newCustomFilter,
				providerId: id,
			});

			if (response.error) {
				setErrorQuery(true);
			} else {
				setErrorQuery(false);
			}

			const provider = id !== "" ? props.activeProviders.find(_ => _.id === id) : undefined;
			if (provider) {
				const cardsWithProvider: CardView[] = response.cards.map(card => {
					return {
						...card,
						provider: { id: provider.id, name: provider.name },
						key: "card-" + card.id,
					};
				});
				setLoadingTest(false);
				setTestCards(cardsWithProvider);
			} else {
				setLoadingTest(false);
				setTestCards(response.cards.map(card => ({ ...card, key: "card-" + card.id }) as CardView));
			}
		}
	};

	const firstLoad = cards.length === 0 && derivedState.isLoading;
	const providersLabel =
		props.activeProviders.length === 0 ? (
			"CodeStream"
		) : (
			<SmartFormattedList
				value={props.activeProviders.map(provider => PROVIDER_MAPPINGS[provider.name].displayName)}
			/>
		);

	const closeCustomFilter = () => {
		setValidQuery(true);
		setErrorQuery(false);
		setAddingCustomFilterForProvider(undefined);
		setNewCustomFilter("");
		setNewCustomFilterName("");
		setTestCards(undefined);
	};

	const renderCustomFilter = () => {
		if (!addingCustomFilterForProvider) return null;
		const providerDisplay = PROVIDER_MAPPINGS[addingCustomFilterForProvider.name];

		return (
			<Modal translucent>
				<Dialog title="Create a Custom Filter" onClose={closeCustomFilter}>
					<div className="standard-form">
						<fieldset className="form-body">
							<span dangerouslySetInnerHTML={{ __html: providerDisplay.customFilterHelp || "" }} />
							<span
								dangerouslySetInnerHTML={{ __html: providerDisplay.customFilterExample || "" }}
							/>
							<input
								type="text"
								className="input-text control"
								value={newCustomFilterName}
								onChange={e => setNewCustomFilterName(e.target.value)}
								placeholder="Name Your Custom Filter (optional)"
								style={{ margin: "20px 0 10px 0" }}
							/>
							{!validQuery ? (
								<ErrorMessage>
									<small className="error-message">
										Missing required qualifier.
										{addingCustomFilterForProvider.id === "github*com" ||
										addingCustomFilterForProvider.id === "github/enterprise" ? (
											<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">
												Learn more.
											</Link>
										) : (
											<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">
												Learn more.
											</Link>
										)}
									</small>
								</ErrorMessage>
							) : (
								errorQuery && (
									<ErrorMessage>
										<small className="error-message">
											Invalid query.{" "}
											{addingCustomFilterForProvider.id === "github*com" ||
											addingCustomFilterForProvider.id === "github/enterprise" ? (
												<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">
													Learn more.
												</Link>
											) : (
												<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">
													Learn more.
												</Link>
											)}
										</small>
									</ErrorMessage>
								)
							)}

							<input
								type="text"
								className="input-text control"
								autoFocus
								value={newCustomFilter}
								onChange={e => setNewCustomFilter(e.target.value)}
								placeholder="Enter Custom Filter"
							/>
							<ButtonRow>
								<Button
									disabled={newCustomFilter.length == 0}
									variant="secondary"
									isLoading={loadingTest}
									onClick={() => testCustomFilter(newCustomFilter)}
								>
									&nbsp;&nbsp;&nbsp;&nbsp;Test&nbsp;&nbsp;&nbsp;&nbsp;
								</Button>
								<Button
									disabled={newCustomFilter.length == 0}
									onClick={() => saveCustomFilter(newCustomFilter)}
								>
									&nbsp;&nbsp;&nbsp;&nbsp;Save&nbsp;&nbsp;&nbsp;&nbsp;
								</Button>
							</ButtonRow>
							{testCards != undefined && (
								<div style={{ width: "460px", margin: "20px -20px 0 -20px" }}>
									<h3
										style={{
											padding: "20px 0 0 20px",
											borderTop: "1px solid var(--base-border-color)",
										}}
									>
										{testCards.length} total results
									</h3>
									{testCards.map(card => (
										<Row
											key={card.key}
											onClick={() => selectCard(card)}
											className={card.id === derivedState.selectedCardId ? "selected" : ""}
										>
											<div>
												{card.parentId && (
													<span style={{ display: "inline-block", width: "20px" }}>&nbsp;</span>
												)}
												{card.id === isLoadingCard ? (
													<Icon name="refresh" className="spin" />
												) : card.typeIcon ? (
													<img className="issue-type-icon" src={card.typeIcon} />
												) : (
													card.icon
												)}
											</div>
											<div>
												{card.title}
												<span className="subtle">{card.body}</span>
											</div>
										</Row>
									))}
								</div>
							)}
						</fieldset>
					</div>
				</Dialog>
			</Modal>
		);
	};

	return (
		<>
			{startWorkCard && (
				<StartWork
					card={startWorkCard}
					onClose={() => {
						setStartWorkCard(undefined);
						setReload(reload + 1);
					}}
				/>
			)}
			{renderCustomFilter()}
			<PaneHeader
				title="Issues"
				count={cards.length}
				id={WebviewPanels.Tasks}
				isLoading={derivedState.isLoading}
			>
				{!firstLoad && (
					<Icon
						title="Refresh"
						onClick={() => setReload(reload + 1)}
						className={`fixed ${derivedState.isLoading ? "spin" : "spinnable"}`}
						name="refresh"
						placement="bottom"
						delay={1}
					/>
				)}
				<Icon
					name="plus"
					onClick={() => {
						dispatch(setNewPostEntry("Issues Section"));
						dispatch(openPanel(WebviewPanels.NewIssue));
					}}
					title={"New " + cardLabel}
					placement="bottom"
					delay={1}
				/>
			</PaneHeader>
			{props.paneState !== PaneState.Collapsed && (
				<PaneBody key={"issuespane"}>
					<div className="instructions">
						<Icon name="light-bulb" />
						Start work by grabbing a ticket below, and creating a branch.
					</div>
					{props.loadingMessage ? (
						<div>{props.loadingMessage}</div>
					) : props.activeProviders.length > 0 || derivedState.skipConnect ? (
						<div className="filters" style={{ padding: "0 20px 5px 20px" }}>
							Show{" "}
							{canFilter ? (
								<Filter
									title="Filter Items"
									selected={"selectedLabel"}
									labels={{ selectedLabel }}
									items={[{ label: "-" }, ...menuItems.filters]}
									align="center"
									dontCloseOnSelect
								/>
							) : (
								selectedLabel + " "
							)}
							from{" "}
							<Filter
								title={
									<>
										{derivedState.isLoading && <Icon name="sync" className="spin" />}Select
										Providers
									</>
								}
								selected={"providersLabel"}
								labels={{ providersLabel }}
								items={[{ label: "-" }, ...menuItems.services]}
								align="center"
								dontCloseOnSelect
							/>
						</div>
					) : (
						<>
							<div className="filters" style={{ padding: "0 20px 10px 20px" }}>
								<span>
									Connect your issue provider(s) to make it easy to manage tasks, create branches,
									and connect tasks to commits &amp; PRs.{" "}
									<Tooltip title="Connect later on the Integrations page" placement="top">
										<Linkish
											onClick={() =>
												dispatch(
													setUserPreference({
														prefPath: ["skipConnectIssueProviders"],
														value: true,
													})
												)
											}
										>
											Skip this step.
										</Linkish>
									</Tooltip>
								</span>
							</div>
							<IntegrationButtons noBorder style={{ marginBottom: "20px" }}>
								{props.knownIssueProviderOptions.map(item => {
									if (item.disabled) return null;
									return (
										<Provider key={item.key} onClick={item.action}>
											{item.providerIcon}
											{item.label}
										</Provider>
									);
								})}
							</IntegrationButtons>
							<IssueMissing>
								Don't see your service?{" "}
								<Link href="https://github.com/TeamCodeStream/codestream/issues?q=is%3Aissue+is%3Aopen+label%3A%22issue+tracker%22">
									Let us know.
								</Link>
							</IssueMissing>
						</>
					)}
					{firstLoad && <IssuesLoading />}
					{cards.length == 0 &&
					selectedLabel !== "issues assigned to you" &&
					!props.loadingMessage &&
					derivedState.initialLoadComplete &&
					(props.activeProviders.length > 0 || derivedState.skipConnect) ? (
						<FilterMissing>The selected filter(s) did not return any issues.</FilterMissing>
					) : (
						!props.loadingMessage &&
						(props.activeProviders.length > 0 || derivedState.skipConnect) &&
						cards.length == 0 &&
						derivedState.initialLoadComplete && (
							<FilterMissing>There are no open issues assigned to you.</FilterMissing>
						)
					)}
					{(fetchCardErrors || []).map(fetchCardError => (
						<IssueError>
							<p className="error-message" style={{ margin: "0 0 5px 0" }}>
								Error fetching cards from {fetchCardError.provider}: {fetchCardError.error}
							</p>
						</IssueError>
					))}
					{cards.map(card => (
						<Row
							key={card.key}
							onClick={() => {
								selectCard(card);
								// HostApi.instance.track("StartWork Form Opened", {
								// 	"Opened Via": "Selected Ticket",
								// });
							}}
							className={card.id === derivedState.selectedCardId ? "selected" : ""}
						>
							<div>
								{card.parentId && (
									<span style={{ display: "inline-block", width: "20px" }}>&nbsp;</span>
								)}
								{card.id === derivedState.selectedCardId && (
									<Icon name="arrow-right" className="selected-icon" />
								)}
								{card.id === isLoadingCard ? (
									<Icon name="sync" className="spin" />
								) : card.typeIcon ? (
									<img className="issue-type-icon" src={card.typeIcon} />
								) : (
									card.icon
								)}
							</div>
							<div>
								{card.title}
								<span className="subtle">{card.body}</span>
							</div>
							<div className="icons">
								{card.listName && <span className="status">{card.listName}</span>}
								{card.id === derivedState.selectedCardId && (
									<Icon
										title={`Clear work item`}
										delay={1}
										placement="bottomRight"
										name="x-circle"
										className="clickable"
										onClick={e => {
											e.stopPropagation();
											e.preventDefault();
											clearAndSave();
										}}
									/>
								)}
								{card.url && (
									<Icon
										title={`Open on web`}
										delay={1}
										placement="bottomRight"
										name="globe"
										className="clickable"
										onClick={e => {
											if (card.url) {
												e.stopPropagation();
												e.preventDefault();
												HostApi.instance.send(OpenUrlRequestType, {
													url: card.url,
												});
											}
										}}
									/>
								)}
								{card.provider.id === "codestream" && (
									<Icon
										title={`View Issue Details`}
										delay={1}
										placement="bottomRight"
										name="description"
										className="clickable"
										onClick={e => {
											e.stopPropagation();
											e.preventDefault();
											dispatch(setCurrentCodemark(card.id));
										}}
									/>
								)}
							</div>
						</Row>
					))}
				</PaneBody>
			)}
		</>
	);
});

export const Row = styled.div`
	display: flex;
	position: relative;
	&:not(.no-hover) {
		cursor: pointer;
	}
	white-space: nowrap;
	&.wrap {
		white-space: normal;
	}
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
	padding: 0 10px 0 20px;
	&.selected {
		color: var(--text-color-highlight);
		font-weight: bold;
	}
	&.wide {
		padding: 0;
	}
	&.disabled {
		opacity: 0.5;
	}
	> div {
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 3px 5px 3px 0;
		&:nth-child(1) {
			flex-shrink: 0;
			.icon {
				margin: 0;
			}
		}
		&:nth-child(2) {
			flex-grow: 10;
		}
		&:nth-child(3) {
			flex-shrink: 0;
		}
	}
	.icons {
		margin-left: auto;
		text-align: right;
		color: var(--text-color);
		.icon {
			margin-left: 10px;
			display: none;
		}
		padding-left: 2.5px;
		.clickable {
			opacity: 0.7;
		}
	}
	&:hover .icons .icon {
		display: inline-block !important;
	}
	&:hover > div:nth-child(3) {
		min-width: 30px;
	}
	.status,
	time {
		color: var(--text-color-subtle);
		opacity: 0.75;
		padding-left: 5px;
	}
	&:hover:not(.review) .status,
	&:hover:not(.review) time,
	&:hover:not(.review) .slo-time,
	&:hover:not(.review) .badge {
		display: none;
	}
	@media only screen and (max-width: 350px) {
		.status,
		time {
			display: none;
		}
	}

	&:not(.disabled):not(.no-hover):hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}

	&.no-shrink > div,
	&.no-shrink:hover > div {
		&:nth-child(1) {
			flex-shrink: unset;
		}
		&:nth-child(2) {
			overflow: initial;
		}
	}

	span.subtle {
		display: inline-block;
		padding-left: 15px;
		color: var(--text-color-subtle);
		opacity: 0.75;
	}
	span.subtle-tight {
		display: inline-block;
		padding-left: 12px;
		color: var(--text-color-subtle);
		opacity: 0.75;
	}
	${Headshot} {
		top: 1px;
	}
	// matches for search query
	span > u > b {
		color: var(--text-color-highlight);
	}
	.issue-type-icon {
		width: 16px;
		height: 16px;
		vertical-align: -3px;
		margin-right: 0;
		margin-left: 0;
	}
	.selected-icon {
		position: absolute !important;
		left: 2px;
		top: 3px;
	}
	.cs-tag {
		margin-bottom: 0;
	}
	.cs-tag-container {
		display: inline-block;
		margin-top: -1px;
		vertical-align: top;
		padding-left: 10px;
	}
`;

export const IssueRows = styled.div`
	border-top: 1px solid var(--base-border-color);
	padding-top: 15px;
	padding-bottom: 20px;
`;

export const Linkish = styled.span`
	text-decoration: underline;
	cursor: pointer;
	:hover {
		color: var(--text-color-highlight);
	}
`;

const IssueMissing = styled.div`
	text-align: center;
	padding: 0px 20px 0px 20px;
	margin-top: -20px;
`;

const FilterMissing = styled.div`
	text-align: left;
	padding: 10px 20px 0px 20px;
	color: @text-color-subtle;
	font-size: 12px;
`;

const IssueError = styled.div`
	text-align: left;
	padding: 0 0 0 20px;
	color: @text-color-subtle;
	font-size: 12px;
`;
