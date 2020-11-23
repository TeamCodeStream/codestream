import React from "react";
import { connect } from "react-redux";
import { connectProvider, getUserProviderInfo } from "../../store/providers/actions";
import { openPanel, setIssueProvider } from "../../store/context/actions";
import Icon from "../Icon";
import Menu from "../Menu";
import { AsanaCardControls } from "./AsanaCardControls";
import { BitbucketCardControls } from "./BitbucketCardControls";
import { GitHubCardControls } from "./GitHubCardControls";
import { GitLabCardControls } from "./GitLabCardControls";
import { JiraCardControls } from "./JiraCardControls";
import { SlackCardControls } from "./SlackCardControls";
import { TrelloCardControls } from "./TrelloCardControls";
import { YouTrackCardControls } from "./YouTrackCardControls";
import { AzureDevOpsCardControls } from "./AzureDevOpsCardControls";
import { ClubhouseCardControls } from "./ClubhouseCardControls";
import { ProviderDisplay, PROVIDER_MAPPINGS } from "./types";
import { ThirdPartyProviderConfig, ThirdPartyProviders } from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { PrePRProviderInfoModalProps, PrePRProviderInfoModal } from "../PrePRProviderInfoModal";
import { CodeStreamState } from "@codestream/webview/store";
import { getConnectedProviderNames } from "@codestream/webview/store/providers/reducer";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { CodeStreamIssueControls } from "./CodeStreamIssueControls";

interface ProviderInfo {
	provider: ThirdPartyProviderConfig;
	display: ProviderDisplay;
}

interface ConnectedProps {
	connectedProviderNames: string[];
	currentTeamId: string;
	currentUser: CSMe;
	issueProviderConfig?: ThirdPartyProviderConfig;
	providers: ThirdPartyProviders;
}

interface Props extends ConnectedProps {
	connectProvider(...args: Parameters<typeof connectProvider>): any;
	updateForProvider(...args: Parameters<typeof updateForProvider>): any;
	setIssueProvider(providerId?: string): void;
	openPanel(...args: Parameters<typeof openPanel>): void;
	isEditing?: boolean;
}

interface State {
	isLoading: boolean;
	loadingProvider?: ProviderInfo;
	issueProviderMenuOpen: boolean;
	issueProviderMenuTarget: any;
	propsForPrePRProviderInfoModal?: PrePRProviderInfoModalProps;
}

class CrossPostIssueControls extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		const providerInfo = props.issueProviderConfig
			? this.getProviderInfo(props.issueProviderConfig.id)
			: undefined;
		const loadingProvider = providerInfo;
		this.state = {
			isLoading: false,
			loadingProvider,
			issueProviderMenuOpen: false,
			issueProviderMenuTarget: undefined
		};
	}

	componentDidMount() {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;
		if (!issueProviderConfig || !providerInfo) {
			this.props.setIssueProvider(undefined);
		}
	}

	componentDidUpdate(prevProps: Props, prevState: State) {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;
		if (
			providerInfo &&
			issueProviderConfig &&
			(!prevProps.issueProviderConfig ||
				prevProps.issueProviderConfig.id !== issueProviderConfig.id)
		) {
			this.setState({ isLoading: false });
		} else if (!providerInfo && prevProps.issueProviderConfig) {
			if (this.state.isLoading) {
				this.setState({ isLoading: false, loadingProvider: undefined });
			}
		}
	}

	renderLoading() {
		const { loadingProvider } = this.state;

		return (
			<div className="connect-issue">
				<span>
					<Icon className="spin" name="sync" /> Authenticating with{" "}
					{loadingProvider!.display.displayName}
					...
				</span>
				<a style={{ marginLeft: "5px" }} onClick={this.cancelLoading}>
					cancel
				</a>
			</div>
		);
	}

	cancelLoading = () => {
		this.setState({ isLoading: false });
		this.props.setIssueProvider(undefined);
	};

	renderProviderControls(providerOptions) {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;
		if (!providerInfo) {
			return <CodeStreamIssueControls>{providerOptions}</CodeStreamIssueControls>;
		}
		switch (providerInfo.provider.name) {
			case "jira":
			case "jiraserver": {
				return (
					<JiraCardControls provider={providerInfo.provider}>{providerOptions}</JiraCardControls>
				);
			}
			case "trello": {
				return (
					<TrelloCardControls provider={providerInfo.provider}>
						{providerOptions}
					</TrelloCardControls>
				);
			}
			case "asana": {
				return (
					<AsanaCardControls provider={providerInfo.provider}>{providerOptions}</AsanaCardControls>
				);
			}
			case "github":
			case "github_enterprise": {
				return (
					<GitHubCardControls provider={providerInfo.provider}>
						{providerOptions}
					</GitHubCardControls>
				);
			}
			case "gitlab":
			case "gitlab_enterprise": {
				return (
					<GitLabCardControls provider={providerInfo.provider}>
						{providerOptions}
					</GitLabCardControls>
				);
			}
			case "youtrack": {
				return (
					<YouTrackCardControls provider={providerInfo.provider}>
						{providerOptions}
					</YouTrackCardControls>
				);
			}
			case "bitbucket": {
				return (
					<BitbucketCardControls provider={providerInfo.provider}>
						{providerOptions}
					</BitbucketCardControls>
				);
			}
			case "azuredevops": {
				return (
					<AzureDevOpsCardControls provider={providerInfo.provider}>
						{providerOptions}
					</AzureDevOpsCardControls>
				);
			}
			case "slack": {
				return (
					<SlackCardControls provider={providerInfo.provider}>{providerOptions}</SlackCardControls>
				);
			}

			case "clubhouse": {
				return (
					<ClubhouseCardControls provider={providerInfo.provider}>
						{providerOptions}
					</ClubhouseCardControls>
				);
			}

			default:
				return null;
		}
	}

	render() {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;

		if (this.state.isLoading) return this.renderLoading();

		if (!this.props.providers || !Object.keys(this.props.providers).length) return null;

		const knownIssueProviders = Object.keys(this.props.providers).filter(providerId => {
			const provider = this.props.providers![providerId];
			return provider.hasIssues && !!PROVIDER_MAPPINGS[provider.name];
		});
		if (knownIssueProviders.length === 0) {
			return null;
		}

		const knownIssueProviderOptions = knownIssueProviders
			.map(providerId => {
				const issueProvider = this.props.providers![providerId];
				const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
				const displayName = issueProvider.isEnterprise
					? `${providerDisplay.displayName} - ${issueProvider.host}`
					: providerDisplay.displayName;
				return {
					value: providerId,
					label: displayName,
					action: providerId
				};
			})
			.sort((a, b) => a.label.localeCompare(b.label));
		knownIssueProviderOptions.unshift(
			{ label: "CodeStream", value: "codestream", action: "codestream" },
			{ label: "-", value: "", action: "" }
		);
		const selectedProvider =
			providerInfo &&
			knownIssueProviderOptions.find(provider => provider.value === providerInfo.provider.id);

		const providerOptions = this.renderProviderOptions(selectedProvider, knownIssueProviderOptions);

		return (
			<>
				{this.state.propsForPrePRProviderInfoModal && (
					<PrePRProviderInfoModal {...this.state.propsForPrePRProviderInfoModal} />
				)}
				<div className="connect-issue">{this.renderProviderControls(providerOptions)}</div>
			</>
		);
	}

	renderProviderOptions = (selectedProvider, knownIssueProviderOptions) => {
		return (
			<span className="channel-label" onClick={this.switchIssueProvider}>
				{selectedProvider ? selectedProvider.label : "CodeStream (click for options)"}
				<Icon name="chevron-down" />
				{this.state.issueProviderMenuOpen && (
					<Menu
						align="center"
						compact={true}
						target={this.state.issueProviderMenuTarget}
						items={knownIssueProviderOptions}
						action={this.selectIssueProvider}
					/>
				)}
			</span>
		);
	};

	switchIssueProvider = (event: React.SyntheticEvent) => {
		if (this.props.isEditing) return;

		event.stopPropagation();
		const target = event.target;
		this.setState(state => ({
			issueProviderMenuOpen: !state.issueProviderMenuOpen,
			issueProviderMenuTarget: target
		}));
	};

	selectIssueProvider = providerId => {
		this.setState({ issueProviderMenuOpen: false });
		if (!providerId) return;
		if (providerId === "codestream") {
			this.props.setIssueProvider(undefined);
			return;
		}
		const issueProvider = this.props.providers![providerId];
		const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
		this.onChangeProvider({ provider: issueProvider, display: providerDisplay });
	};

	async onChangeProvider(providerInfo: ProviderInfo) {
		if (
			providerInfo.provider.needsConfigure &&
			!this.providerIsConnected(providerInfo.provider.id)
		) {
			const { name, id } = providerInfo.provider;
			this.props.openPanel(`configure-provider-${name}-${id}-Compose Modal`);
		} else if (
			providerInfo.provider.forEnterprise &&
			!this.providerIsConnected(providerInfo.provider.id)
		) {
			const { name, id } = providerInfo.provider;
			/* if (name === "github_enterprise") {
				this.setState({
					propsForPrePRProviderInfoModal: {
						providerName: name,
						onClose: () => this.setState({ propsForPrePRProviderInfoModal: undefined }),
						action: () => this.props.openPanel(`configure-enterprise-${name}-${id}`)
					}
				});
			} else */ this.props.openPanel(
				`configure-enterprise-${name}-${id}-Compose Modal`
			);
		} else {
			const { name } = providerInfo.provider;
			const { connectedProviderNames, issueProviderConfig } = this.props;
			const newValueIsNotCurrentProvider =
				issueProviderConfig == undefined || issueProviderConfig.name !== name;
			const newValueIsNotAlreadyConnected = !connectedProviderNames.includes(name);
			if (
				newValueIsNotCurrentProvider &&
				newValueIsNotAlreadyConnected &&
				(name === "github" || name === "bitbucket" || name === "gitlab")
			) {
				this.setState({
					propsForPrePRProviderInfoModal: {
						providerName: name,
						onClose: () => {
							this.setState({ propsForPrePRProviderInfoModal: undefined });
						},
						action: () => {
							this.setState({ isLoading: true, loadingProvider: providerInfo });
							this.props.connectProvider(providerInfo.provider.id, "Compose Modal");
						}
					}
				});
			} else {
				this.setState({ isLoading: true, loadingProvider: providerInfo });
				const ret = await this.props.connectProvider(providerInfo.provider.id, "Compose Modal");
				if (ret && ret.alreadyConnected) this.setState({ isLoading: false });
			}
		}
	}

	getProviderInfo(providerId: string): ProviderInfo | undefined {
		const provider = this.props.providers ? this.props.providers[providerId] : undefined;
		if (!provider) return undefined;
		const display = provider ? PROVIDER_MAPPINGS[provider.name] : undefined;
		if (!display) return undefined;
		let providerInfo = getUserProviderInfo(
			this.props.currentUser,
			provider.name,
			this.props.currentTeamId
		);
		if (!providerInfo) return;
		if (providerInfo.accessToken) return { provider, display };
		if (!provider.isEnterprise) return undefined;
		if (!providerInfo!.hosts) return undefined;
		providerInfo = providerInfo!.hosts[provider.id];
		if (!providerInfo) return undefined;
		return { provider, display };
	}

	providerIsConnected(providerId: string): boolean {
		const provider = this.props.providers ? this.props.providers[providerId] : undefined;
		const { currentUser } = this.props;
		if (!provider || currentUser.providerInfo == undefined) return false;
		let providerInfo = getUserProviderInfo(currentUser, provider.name, this.props.currentTeamId);
		if (!providerInfo) return false;
		if (providerInfo.accessToken) return true;
		if (!provider.isEnterprise) return false;
		if (!providerInfo.hosts) return false;
		providerInfo = providerInfo.hosts[provider.id];
		return providerInfo && !!providerInfo.accessToken;
	}
}

const mapStateToProps = (state: CodeStreamState): ConnectedProps => {
	const { users, session, context, providers } = state;
	const currentIssueProviderConfig = context.issueProvider
		? providers[context.issueProvider]
		: undefined;
	return {
		currentUser: users[session.userId!] as CSMe,
		currentTeamId: context.currentTeamId,
		providers,
		issueProviderConfig: currentIssueProviderConfig,
		connectedProviderNames: getConnectedProviderNames(state)
	};
};

export default connect(mapStateToProps, {
	connectProvider,
	setIssueProvider,
	openPanel,
	updateForProvider
})(CrossPostIssueControls);

// {false && (
// 	<Select
// 		id="input-provider"
// 		name="providers"
// 		classNamePrefix="native-key-bindings react-select"
// 		value={selectedProvider}
// 		options={knownIssueProviderOptions}
// 		closeMenuOnSelect={true}
// 		isClearable={false}
// 		placeholder="select service"
// 		onChange={value => {
// 			const providerId = (value as { value: string })!.value;
// 			const issueProvider = this.props.providers![providerId];
// 			const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
// 			this.onChangeProvider({ provider: issueProvider, display: providerDisplay });
// 		}}
// 		//tabIndex={this.tabIndex().toString()}
// 	/>
// )}
