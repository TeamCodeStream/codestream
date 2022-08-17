import React from "react";
import styled from "styled-components";
import { last as getLast } from "lodash-es";
import Icon from "./Icon";
import { Button } from "../src/components/Button";
import { HostApi } from "../webview-api";
import {
	FetchThirdPartyChannelsRequestType,
	CreateThirdPartyPostRequest,
	ThirdPartyChannel
} from "@codestream/protocols/agent";
import { CodeStreamState } from "../store";
import { useSelector, useDispatch } from "react-redux";
import {
	isConnected,
	getProviderConfig,
	getConnectedSharingTargets
} from "../store/providers/reducer";
import { connectProvider } from "../store/providers/actions";
import { getIntegrationData } from "../store/activeIntegrations/reducer";
import { updateForProvider } from "../store/activeIntegrations/actions";
import { ActiveIntegrationData, SlackV2IntegrationData } from "../store/activeIntegrations/types";
import { setContext } from "../store/context/actions";
import { safe } from "../utils";
import { useDidMount, useUpdates } from "../utilities/hooks";
import { setUserPreference } from "./actions";
import { Modal } from "./Modal";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { Tabs, Tab } from "../src/components/Tabs";
import { CSTeamSettings } from "@codestream/protocols/api";

const TextButton = styled.span`
	color: ${props => props.theme.colors.textHighlight};
	cursor: pointer;
	.octicon-chevron-down,
	.octicon-chevron-down-thin {
		transform: scale(0.7);
		margin-left: 2px;
		margin-right: 5px;
	}
	&:focus {
		margin: -3px;
		border: 3px solid transparent;
	}
`;

const ChannelTable = styled.table`
	color: ${props => props.theme.colors.text};
	margin: 0 auto;
	border-collapse: collapse;
	td {
		text-align: left;
		white-space: nowrap;
		padding: 2px 10px;
		.icon {
			vertical-align: -2px;
		}
	}
	tbody tr:hover td {
		background: rgba(127, 127, 127, 0.1);
	}
	hr {
		border: none;
		border-bottom: 1px solid ${props => props.theme.colors.baseBorder};
	}
`;

const Root = styled.div`
	color: ${props => props.theme.colors.textSubtle};
	.octicon {
		fill: currentColor;
		vertical-align: text-top;
	}
`;

const formatChannelName = (channel: { type: string; name: string }) =>
	channel.type === "direct" ? channel.name : `#${channel.name}`;

function useActiveIntegrationData<T extends ActiveIntegrationData>(providerId: string) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<T>(state.activeIntegrations, providerId)
	);

	return React.useMemo(() => {
		return {
			get() {
				return data;
			},
			set(fn: (data: T) => T) {
				dispatch(updateForProvider(providerId, fn(data)));
			}
		};
	}, [data]);
}

function useDataForTeam(providerId: string, providerTeamId: string = "") {
	const data = useActiveIntegrationData<SlackV2IntegrationData>(providerId);
	const teamData = data.get()[providerTeamId] || { channels: [] };

	return React.useMemo(() => {
		return {
			get() {
				return teamData;
			},
			set(fn: (currentTeamData: typeof teamData) => typeof teamData) {
				data.set(d => ({ ...d, [providerTeamId]: fn(teamData) }));
			}
		};
	}, [teamData]);
}

type BaseSharingAttributes = {
	providerId: string;
	providerTeamId: string;
	providerTeamName?: string;
	channelName?: string;
	botUserId?: string;
};

type ChannelSharingAttributes = BaseSharingAttributes & {
	type: "channel";
	channelId: string;
};

type DirectSharingAttributes = BaseSharingAttributes & {
	type: "direct";
	userIds: string[];
};

export type SharingAttributes = ChannelSharingAttributes | DirectSharingAttributes;

const EMPTY_HASH = {};
export const SharingControls = React.memo(
	(props: {
		onChangeValues: (values?: SharingAttributes) => void;
		showToggle?: boolean;
		repoId?: string;
	}) => {
		const dispatch = useDispatch();

		const derivedState = useSelector((state: CodeStreamState) => {
			const currentTeamId = state.context.currentTeamId;
			const preferencesForTeam = state.preferences[currentTeamId] || {};

			const defaultChannels = preferencesForTeam.defaultChannel || {};
			const defaultChannel = props.repoId && defaultChannels[props.repoId];

			// this is what we've persisted in the server as the last selection the user made
			const lastShareAttributes: ChannelSharingAttributes | undefined =
				preferencesForTeam.lastShareAttributes;

			const shareTargets = getConnectedSharingTargets(state);
			const selectedShareTarget = shareTargets.find(
				target =>
					target.teamId ===
					(state.context.shareTargetTeamId ||
						(defaultChannel && defaultChannel.providerTeamId) ||
						(lastShareAttributes && lastShareAttributes.providerTeamId))
			);

			const team = state.teams[state.context.currentTeamId];
			const teamSettings = team.settings || (EMPTY_HASH as CSTeamSettings);

			const slackServerProviderData = team.serverProviderData?.slack?.multiple;

			return {
				currentTeamId,
				on: shareTargets.length > 0 && Boolean(preferencesForTeam.shareCodemarkEnabled),
				slackConfig: getProviderConfig(state, "slack"),
				msTeamsConfig: getProviderConfig(state, "msteams"),
				isConnectedToSlack: isConnected(state, { name: "slack" }),
				isConnectedToMSTeams: isConnected(state, { name: "msteams" }),
				shareTargets,
				selectedShareTarget: selectedShareTarget || shareTargets[0],
				lastSelectedChannelId: lastShareAttributes && lastShareAttributes.channelId,
				repos: state.repos,
				defaultChannelId: defaultChannel && defaultChannel.channelId,
				defaultChannels,
				teamSettings,
				slackServerProviderData
			};
		});
		const [authenticationState, setAuthenticationState] = React.useState<{
			isAuthenticating: boolean;
			label: string;
		}>({ isAuthenticating: false, label: "" });
		const [isFetchingData, setIsFetchingData] = React.useState<boolean>(false);
		const [editingChannels, setEditingChannels] = React.useState<boolean>(false);
		const [currentChannel, setCurrentChannel] = React.useState<ThirdPartyChannel | undefined>(
			undefined
		);
		const [channelOrDirect, setChannelOrDirect] = React.useState<"channel" | "direct">("channel");
		const [checkedUsers, setCheckedUsers] = React.useState<string[]>([]);

		const toggleUserChecked = user => {
			if (checkedUsers.includes(user)) {
				setCheckedUsers(checkedUsers.filter(u => u !== user));
			} else {
				setCheckedUsers([...checkedUsers, user]);
			}
		};

		useDidMount(() => {
			if (
				!derivedState.selectedShareTarget ||
				(!derivedState.isConnectedToSlack && !derivedState.isConnectedToMSTeams)
			) {
				dispatch(setUserPreference([derivedState.currentTeamId, "shareCodemarkEnabled"], false));
			}
		});

		const selectedShareTargetTeamId = safe(() => derivedState.selectedShareTarget.teamId) as
			| string
			| undefined;

		const data = useDataForTeam(
			derivedState.slackConfig
				? derivedState.slackConfig.id
				: derivedState.msTeamsConfig
				? derivedState.msTeamsConfig.id
				: "",
			selectedShareTargetTeamId
		);

		const setCheckbox = value =>
			dispatch(setUserPreference([derivedState.currentTeamId, "shareCodemarkEnabled"], value));

		const toggleCheckbox = () => setCheckbox(!derivedState.on);

		const setSelectedShareTarget = target => {
			setCheckbox(true);
			dispatch(setContext({ shareTargetTeamId: target.teamId }));
		};

		useUpdates(() => {
			const numberOfTargets = derivedState.shareTargets.length;
			if (numberOfTargets === 0) return;

			// when the first share target is connected, turn on sharing
			if (numberOfTargets === 1 && !derivedState.on) toggleCheckbox();

			// if we're waiting on something to be added, this is it so make it the current selection
			if (authenticationState && authenticationState.isAuthenticating) {
				const newShareTarget = getLast(derivedState.shareTargets)!;
				setSelectedShareTarget(newShareTarget);
				setAuthenticationState({ isAuthenticating: false, label: "" });
			}
		}, [derivedState.shareTargets.length]);

		// when selected share target changes, fetch channels
		React.useEffect(() => {
			const { selectedShareTarget } = derivedState;
			if (selectedShareTarget) {
				if (data.get().channels.length === 0) setIsFetchingData(true);
				void (async () => {
					try {
						const response = await HostApi.instance.send(FetchThirdPartyChannelsRequestType, {
							providerId: selectedShareTarget.providerId,
							providerTeamId: selectedShareTarget.teamId
						});
						/*
							if we know the channel the user last selected for this target
							AND the webview doesn't currently have one selected,
							use the last selected one if it still exists
						 */
						const channelIdToSelect =
							derivedState.defaultChannelId || derivedState.lastSelectedChannelId;
						const channelToSelect =
							channelIdToSelect != undefined
								? response.channels.find(c => c.id === channelIdToSelect)
								: undefined;
						let botUserId;
						if (selectedShareTarget.providerId === "slack*com") {
							const teamData = derivedState.slackServerProviderData
								? derivedState.slackServerProviderData[selectedShareTarget.teamId]
								: undefined;
							botUserId = teamData ? teamData.bot_user_id : undefined;
						}
						const members = (response.members || []).filter(_ => _.id !== botUserId);
						data.set(teamData => ({
							...teamData,
							channels: response.channels,
							members: members,
							lastSelectedChannel: channelToSelect || teamData.lastSelectedChannel
						}));
						setCurrentChannel(undefined);
					} catch (error) {
					} finally {
						setIsFetchingData(false);
					}
				})();
			}
		}, [selectedShareTargetTeamId]);

		const selectedChannel = React.useMemo(() => {
			const { channels, lastSelectedChannel } = data.get();

			// if the user has picked a channel this session, return it
			if (currentChannel != undefined) return currentChannel;

			// otherwise, if there is a default for this repo, return that
			if (derivedState.defaultChannelId != undefined) {
				const channel = channels.find(c => c.id === derivedState.defaultChannelId);
				if (channel) return channel;
			}

			// otherwise, return the last selected channel (saved on server in preferences)
			return lastSelectedChannel;
		}, [currentChannel, derivedState.defaultChannelId, data]);

		React.useEffect(() => {
			const shareTarget = derivedState.selectedShareTarget;

			if (shareTarget && channelOrDirect === "channel" && selectedChannel) {
				let botUserId;
				if (shareTarget.providerId === "slack*com") {
					const teamData = derivedState.slackServerProviderData
						? derivedState.slackServerProviderData[shareTarget.teamId]
						: undefined;
					botUserId = teamData ? teamData.bot_user_id : undefined;
				}
				props.onChangeValues({
					type: "channel",
					providerId: shareTarget.providerId,
					providerTeamId: shareTarget.teamId,
					providerTeamName: shareTarget.teamName,
					channelId: selectedChannel && selectedChannel.id,
					channelName: selectedChannel && formatChannelName(selectedChannel),
					botUserId
				});
				dispatch(
					setUserPreference([derivedState.currentTeamId, "lastShareAttributes"], {
						channelId: selectedChannel.id,
						providerId: shareTarget.providerId,
						providerTeamId: shareTarget.teamId
					})
				);
			} else if (
				shareTarget &&
				channelOrDirect === "direct" &&
				checkedUsers &&
				checkedUsers.length
			) {
				let botUserId;
				if (shareTarget.providerId === "slack*com") {
					const teamData = derivedState.slackServerProviderData
						? derivedState.slackServerProviderData[shareTarget.teamId]
						: undefined;
					botUserId = teamData ? teamData.bot_user_id : undefined;
				}
				const dataForTeam = data.get();
				const members = dataForTeam.members || [];
				const channelName = members
					.filter(user => checkedUsers.includes(user.id))
					.map(user => user.name)
					.sort()
					.join(", ");
				props.onChangeValues({
					type: "direct",
					providerId: shareTarget.providerId,
					providerTeamId: shareTarget.teamId,
					providerTeamName: shareTarget.teamName,
					userIds: checkedUsers,
					channelName,
					botUserId
				});
			} else props.onChangeValues(undefined);
		}, [
			derivedState.selectedShareTarget && derivedState.selectedShareTarget.teamId,
			selectedChannel && selectedChannel.id,
			checkedUsers,
			channelOrDirect,
			// hack[?] for asserting this hook runs after the data has changed.
			// for some reason selectedChannel updating is not making this hook
			// re-run
			isFetchingData
		]);

		const { teamSettings } = derivedState;
		const providers = teamSettings.messagingProviders || {};
		const showSlack = !teamSettings.limitMessaging || providers["slack*com"];
		const showTeams = !teamSettings.limitMessaging || providers["login*microsoftonline*com"];

		const shareProviderMenuItems = React.useMemo(() => {
			const targetItems = derivedState.shareTargets.map(target => ({
				key: target.teamId,
				icon: <Icon name={target.icon} />,
				label: target.teamName,
				action: () => setSelectedShareTarget(target)
			}));
			if (derivedState.slackConfig || derivedState.msTeamsConfig) {
				targetItems.push({ label: "-" } as any);
				if (showSlack && derivedState.slackConfig)
					targetItems.push({
						key: "add-slack",
						icon: <Icon name="slack" />,
						label: "Add Slack workspace",
						action: (() => {
							authenticateWithSlack();
						}) as any
					});
				if (showTeams && derivedState.msTeamsConfig) {
					targetItems.push({
						key: "add-msteams",
						icon: <Icon name="msteams" />,
						label: "Add Teams organization",
						action: (() => {
							authenticateWithMSTeams();
						}) as any
					} as any);
				}
			}
			return targetItems;
		}, [derivedState.shareTargets, derivedState.slackConfig, derivedState.msTeamsConfig]);

		const getMenuTabBar = () => [
			{
				fragment: (
					<Tabs style={{ margin: "10px 0 0 0" }}>
						<Tab
							onClick={() => setChannelOrDirect("channel")}
							active={channelOrDirect === "channel"}
							style={{
								flex: 1,
								textAlign: "center",
								borderBottom:
									channelOrDirect === "channel"
										? "1px solid var(--text-color)"
										: "1px solid rgba(127, 127, 127, 0.2)"
							}}
						>
							Channel
						</Tab>
						<Tab
							onClick={() => setChannelOrDirect("direct")}
							active={channelOrDirect === "direct"}
							style={{
								flex: 1,
								textAlign: "center",
								borderBottom:
									channelOrDirect === "direct"
										? "1px solid var(--text-color)"
										: "1px solid rgba(127, 127, 127, 0.2)"
							}}
						>
							DM
						</Tab>
					</Tabs>
				)
			}
		];

		const getChannelMenuItems = (action, showTabBar: boolean) => {
			// return React.useMemo(() => {
			if (derivedState.selectedShareTarget == undefined) return [];

			const dataForTeam = data.get();
			if (dataForTeam.channels == undefined) return [];

			const tabBar =
				showTabBar && dataForTeam.members && dataForTeam.members.length
					? getMenuTabBar()
					: [{ label: "-" }];
			const { dms, others } = dataForTeam.channels.reduce(
				(group, channel) => {
					const channelName = formatChannelName(channel);
					const item = {
						key: channel.name,
						label: channelName,
						searchLabel: channelName,
						action: () => action(channel)
					};
					if (channel.type === "direct") {
						group.dms.push(item);
					} else group.others.push(item);

					return group;
				},
				{ dms: [], others: [] } as { dms: any[]; others: any[] }
			);
			const search =
				dataForTeam.channels.length > 5
					? [{ type: "search", placeholder: "Search channels..." }]
					: [];
			const dmItems = dms && dms.length ? [{ label: "-" }, ...dms] : [];

			return [...search, ...tabBar, ...others, ...dmItems];
			// }, [data.get().channels]);
		};

		const getImMenuItems = () => {
			const dataForTeam = data.get();
			if (dataForTeam.members == undefined) return [];

			const mapUserToMenuItem = user => ({
				key: user.id,
				label: user.name,
				searchLabel: user.name,
				checked: checkedUsers.includes(user.id),
				disabled: checkedUsers.length >= 7 && !checkedUsers.includes(user.id),
				action: () => toggleUserChecked(user.id)
			});

			const tabBar = getMenuTabBar();

			const selectedUsers = dataForTeam.members
				.filter(user => checkedUsers.includes(user.id))
				.map(mapUserToMenuItem);
			const unselectedUsers = dataForTeam.members
				.filter(user => !checkedUsers.includes(user.id))
				.map(mapUserToMenuItem);
			const users = [...selectedUsers, ...unselectedUsers];

			const search = users.length > 5 ? [{ type: "search", placeholder: "Search users..." }] : [];

			return [...search, ...tabBar, ...users];
		};

		const setChannel = channel => {
			if (props.showToggle) setCheckbox(true);
			setCurrentChannel(channel);
			data.set(teamData => ({ ...teamData, lastSelectedChannel: channel }));
		};

		const getMenuItems = () => {
			if (channelOrDirect === "channel") {
				return getChannelMenuItems(channel => setChannel(channel), true);
			}
			return getImMenuItems();
		};

		const authenticateWithSlack = () => {
			setAuthenticationState({ isAuthenticating: true, label: "Slack" });
			dispatch(connectProvider(derivedState.slackConfig!.id, "Compose Modal"));
		};

		const authenticateWithMSTeams = () => {
			setAuthenticationState({ isAuthenticating: true, label: "MS Teams" });
			dispatch(connectProvider(derivedState.msTeamsConfig!.id, "Compose Modal"));
		};

		if (derivedState.slackConfig == undefined) return null;

		if (authenticationState && authenticationState.isAuthenticating)
			return (
				<Root>
					<Icon name="sync" className="spin" />{" "}
					{authenticationState.label == "MS Teams"
						? "Setting up MS Teams bot"
						: `Authenticating with ${authenticationState.label}`}
					...{" "}
					<a
						onClick={e => {
							e.preventDefault();
							setAuthenticationState({ isAuthenticating: false, label: "" });
						}}
					>
						cancel
					</a>
				</Root>
			);

		if (isFetchingData)
			return (
				<Root>
					<Icon name="sync" className="spin" /> Fetching channels...{" "}
					<a
						onClick={e => {
							e.preventDefault();
							setIsFetchingData(false);
						}}
					>
						cancel
					</a>
				</Root>
			);

		if (
			!derivedState.selectedShareTarget ||
			(!derivedState.isConnectedToSlack && !derivedState.isConnectedToMSTeams)
		) {
			if (!showSlack && !showTeams) return null;
			return (
				<Root>
					Share on{" "}
					{showSlack && (
						<TextButton
							onClick={async e => {
								e.preventDefault();
								authenticateWithSlack();
							}}
						>
							<Icon name="slack" /> Slack
						</TextButton>
					)}
					{derivedState.msTeamsConfig != undefined && showTeams && (
						<>
							{" "}
							{showSlack && <>or </>}
							<TextButton
								onClick={e => {
									e.preventDefault();
									authenticateWithMSTeams();
								}}
							>
								<Icon name="msteams" /> MS Teams
							</TextButton>
						</>
					)}
				</Root>
			);
		}

		const setDefaultChannel = (repoId, providerTeamId, channelId) => {
			const value = { providerTeamId, channelId };
			dispatch(setUserPreference([derivedState.currentTeamId, "defaultChannel", repoId], value));
		};

		const getChannelById = id => {
			return data.get().channels.find(c => c.id == id);
		};

		const getSelectedTarget = () => {
			if (channelOrDirect === "channel") {
				return selectedChannel == undefined
					? "select a channel"
					: formatChannelName(selectedChannel);
			}
			const dataForTeam = data.get();
			if (dataForTeam.members == undefined) return "select a channel";
			if (checkedUsers.length === 0) return "select users";
			return checkedUsers
				.map(a => dataForTeam.members!.find(b => b.id === a))
				.map(_ => _?.name)
				.filter(Boolean)
				.sort()
				.join(", ");
		};

		const renderDefaultChannels = () => {
			const { repos, defaultChannels } = derivedState;
			return (
				<Root>
					<ChannelTable>
						<thead>
							<tr>
								<td>Repo</td>
								<td>Default</td>
							</tr>
							<tr>
								<td colSpan={2}>
									<hr />
								</td>
							</tr>
						</thead>
						<tbody>
							{Object.keys(repos)
								.sort((a, b) => repos[a].name.localeCompare(repos[b].name))
								.map(key => {
									const defaultSettings = defaultChannels[key];
									const defaultChannel = defaultSettings
										? getChannelById(defaultSettings.channelId)
										: undefined;
									return (
										<tr>
											<td>
												<Icon name="repo" /> {repos[key].name}
											</td>
											<td>
												<InlineMenu
													items={getChannelMenuItems(
														channel =>
															setDefaultChannel(
																key,
																derivedState.selectedShareTarget!.teamId,
																channel.id
															),
														false
													)}
													title={`Default Channel for ${repos[key].name}`}
												>
													{defaultChannel == undefined
														? "last channel used "
														: formatChannelName(defaultChannel)}
												</InlineMenu>
											</td>
										</tr>
									);
								})}
						</tbody>
					</ChannelTable>
					<div style={{ textAlign: "center", margin: "20px auto" }}>
						<Button onClick={e => setEditingChannels(false)}>Done</Button>
					</div>
				</Root>
			);
		};

		if (editingChannels) {
			return <Modal onClose={() => setEditingChannels(false)}>{renderDefaultChannels()}</Modal>;
		}

		const hasRepos = derivedState.repos && Object.keys(derivedState.repos).length > 0;
		const channelTitleIcon = hasRepos ? (
			<Icon
				name="gear"
				title="Set Default Channels"
				placement="top"
				onClick={e => setEditingChannels(!editingChannels)}
			/>
		) : null;
		return (
			<Root>
				{props.showToggle && (
					<>
						<input type="checkbox" checked={derivedState.on} onChange={toggleCheckbox} />
					</>
				)}
				Share on{" "}
				<InlineMenu items={shareProviderMenuItems}>
					<Icon name={derivedState.selectedShareTarget!.icon} />{" "}
					{derivedState.selectedShareTarget!.teamName}
				</InlineMenu>{" "}
				{channelOrDirect === "channel" ? "in " : "with "}
				<InlineMenu
					items={getMenuItems()}
					title="Post to..."
					titleIcon={channelTitleIcon}
					dontCloseOnSelect={channelOrDirect === "direct"}
					isMultiSelect={channelOrDirect === "direct"}
				>
					{getSelectedTarget()}
				</InlineMenu>
			</Root>
		);
	}
);
