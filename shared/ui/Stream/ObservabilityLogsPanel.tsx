import React, { Component } from "react";
import { debounce } from "lodash-es";
import { connect } from "react-redux";
import Icon from "./Icon";
import { Dialog } from "../src/components/Dialog";
import { SetUserPreferenceRequest } from "./actions.types";
import { WithSearchableItemsProps, withSearchableItems } from "./withSearchableItems";
import { PanelHeader } from "../src/components/PanelHeader";
import styled from "styled-components";
import ScrollBox from "./ScrollBox";
import { HostApi } from "../webview-api";
import { Disposable } from "vscode-languageserver-protocol";
import { AnyObject } from "../utils";
import {
	GetLogsRequestType,
	isNRErrorResponse,
} from "../../util/src/protocol/agent/agent.protocol.providers";
import { CodeStreamState } from "../store";
import { closePanel, setUserPreference } from "./actions";

const SearchBar = styled.div`
	display: flex;
	flex-direction: row;
	button {
		z-index: 2;
	}
	.search-input {
		position: relative;
		flex-grow: 10;
		width: 100%;
		input.control {
			// make space for the search icon
			padding-left: 32px !important;
			// the bookmark icon is narrower so requires less space
			padding-right: 45px !important;
			height: 100%;
			border: 1px solid var(--base-border-color);
			border-left: none;
			margin-left: -1px;
		}
		.icon.search {
			position: absolute;
			left: 8px;
			top: 6px;
			opacity: 0.5;
		}
		.save {
			position: absolute;
			right: 6px;
			top: 6px;
			opacity: 0.5;
			&:hover {
				opacity: 1;
			}
		}
		.clear {
			position: absolute;
			right: 28px;
			top: 6px;
			opacity: 0.5;
			&:hover {
				opacity: 1;
			}
		}
	}
`;

interface DispatchProps {
	setUserPreference: (request: SetUserPreferenceRequest) => void;
	closePanel: Function;
}

interface ConnectedProps {
	entityGuid?: string;
}

interface Props extends ConnectedProps, DispatchProps, WithSearchableItemsProps {}

interface State {
	isLoading: boolean;
	maximized: boolean;
	totalItems: number;
	displayItems: AnyObject;
	filters: AnyObject;
}

export const LogRow = (props: { logEntry: string }) => {
	return (
		<>
			<tr>
				<td colSpan={4}>{props.logEntry}</td>
			</tr>
			<tr>
				<td colSpan={4}>&nbsp;</td>
			</tr>
		</>
	);
};

export class ObservabilityLogsPanel extends Component<Props, State> {
	readonly disposables: Disposable[] = [];
	_searchInput: any;

	constructor(props: Props) {
		super(props);
		this.state = {
			isLoading: props.items.length === 0,
			totalItems: 0,
			maximized: false,
			displayItems: {},
			filters: {},
		};
	}

	componentDidMount() {
		this.fetchLogs(this.props.entityGuid, this.props.query);
	}

	componentDidUpdate(prevProps: Props) {
		if (this.props.query !== prevProps.query || this.props.items !== prevProps.items) {
			this.debouncedApplyQuery(this.props.query);
		}
	}

	componentWillUnmount() {
		this.disposables.forEach(d => d.dispose());
	}

	async fetchLogs(entityGuid?: string, query?: string) {
		let totalItems = 0;

		const filters = this.getFilters(query);

		const q = (filters.text || "").toLocaleLowerCase();

		try {
			if (entityGuid) {
				const response = await HostApi.instance.send(GetLogsRequestType, {
					entityGuid,
					limit: "MAX",
					since: "3 HOURS AGO",
					order: {
						field: "timestamp",
						direction: "DESC",
					},
				});

				if (response) {
					if (isNRErrorResponse(response?.error)) {
						//setLogError(response.error?.error?.message ?? response.error?.error?.type);
					} else {
						//setLogError(undefined);
					}

					if (response.logs && response.logs.length > 0) {
						const formattedLogLines: string[] = [];
						response.logs.map(log => {
							let formattedLogLine: string = "";
							for (const key in Object.keys(log)) {
								const keyName = Object.keys(log)[key];
								formattedLogLine += `${log[keyName]} | `;
							}

							formattedLogLines.push(formattedLogLine);
						});

						this.setState({
							filters,
							displayItems: formattedLogLines,
							totalItems: response.logs.length,
						});
					}
				} else {
					console.debug(`o11y: no logs`);
					this.setState({ filters, displayItems: [], totalItems });
				}
			} else {
				console.debug(`o11y: no logs (no entityGuid)`);
				this.setState({ filters, displayItems: [], totalItems });
			}
		} finally {
			//setLoadingLogs(false);
		}
	}

	getFilters = (query?: string) => {
		let text = query || "";
		const filters: AnyObject = {};
		let match;

		if (text.match(/\b(is|status):open\b/)) {
			filters.status = "open";
			text = text.replace(/\s*(is|status):open\s*/, " ");
		}
		if (text.match(/\b(is|status):closed\b/)) {
			filters.status = "closed";
			text = text.replace(/\s*(is|status):closed\s*/, " ");
		}
		if (text.match(/\b(is|status):approved\b/)) {
			filters.status = "approved";
			text = text.replace(/\s*(is|status):approved\s*/, " ");
		}
		if (text.match(/\b(is|type):issue\b/)) {
			filters.type = "issue";
			text = text.replace(/\s*(is|type):issue\s*/, " ");
		}
		if (text.match(/\b(is|type):comment\b/)) {
			filters.type = "comment";
			text = text.replace(/\s*(is|type):comment\s*/, " ");
		}
		if (text.match(/\b(is|type):fr\b/)) {
			filters.type = "review";
			text = text.replace(/\s*(is|type):fr\s*/, " ");
		}
		if (text.match(/\b(is|type):cr\b/)) {
			filters.type = "review";
			text = text.replace(/\s*(is|type):cr\s*/, " ");
		}
		while ((match = text.match(/\btag:\"(.*?)\"(\s|$)/))) {
			if (!filters.tags) filters.tags = [];
			filters.tags.push(match[1]);
			text = text.replace(/\s*tag:\"(.*?)\"\s*/, " ");
		}
		while ((match = text.match(/\btag:(\S+)(\s|$)/))) {
			if (!filters.tags) filters.tags = [];
			filters.tags.push(match[1]);
			text = text.replace(/\s*tag:(\S+)\s*/, " ");
		}
		if (text.match(/\bno:tag\b/)) {
			filters.noTag = true;
			text = text.replace(/\s*no:tag\s*/, " ");
		}

		match = text.match(/\bbranch:\"(.*?)\"(\s|$)/);
		if (match) {
			filters.branch = match[1];
			text = text.replace(/\s*branch:\"(.*?)\"\s*/, " ");
		}
		match = text.match(/\bbranch:(\S+)(\s|$)/);
		if (match) {
			filters.branch = match[1];
			text = text.replace(/\s*branch:(\S+)\s*/, " ");
		}

		match = text.match(/\bcommit:\"(.*?)\"(\s|$)/);
		if (match) {
			filters.commit = match[1];
			text = text.replace(/\s*commit:\"(.*?)\"\s*/, " ");
		}
		match = text.match(/\bcommit:(\S+)(\s|$)/);
		if (match) {
			filters.commit = match[1];
			text = text.replace(/\s*commit:(\S+)\s*/, " ");
		}

		match = text.match(/\brepo:\"(.*?)\"(\s|$)/);
		if (match) {
			filters.repo = match[1];
			text = text.replace(/\s*repo:\"(.*?)\"\s*/, " ");
		}
		match = text.match(/\brepo:(\S+)(\s|$)/);
		if (match) {
			filters.repo = match[1];
			text = text.replace(/\s*repo:(\S+)\s*/, " ");
		}

		match = text.match(/\bupdated:([<>]?)(\d\d\d\d)-(\d+)-(\d+)(\s|$)/);
		if (match) {
			const date = new Date(match[2], match[3] - 1, match[4]);
			if (match[1] === "<") filters.updatedBefore = date.getTime();
			if (match[1] === ">") filters.updatedAfter = date.getTime();
			if (!match[1]) filters.updatedOn = date;
			text = text.replace(/\s*updated:[<>]?(\S+)\s*/, " ");
		}
		match = text.match(/\bcreated:([<>]?)(\d\d\d\d)-(\d+)-(\d+)(\s|$)/);
		if (match) {
			const date = new Date(match[2], match[3] - 1, match[4]);
			if (match[1] === "<") filters.createdBefore = date.getTime();
			if (match[1] === ">") filters.createdAfter = date.getTime();
			if (!match[1]) filters.createdOn = date;
			text = text.replace(/\s*created:[<>]?(\S+)\s*/, " ");
		}
		match = text.match(/\bupdated:([<>]?)(\d\d\d\d)-(\d+)-(\d+)(\s|$)/);
		if (match) {
			const date = new Date();
			date.setHours(0, 0, 0, 0);
			if (match[2] === "yesterday") date.setDate(date.getDate() - 1);
			if (match[1] === "<") filters.updatedBefore = date.getTime();
			if (match[1] === ">") filters.updatedAfter = date.getTime();
			if (!match[1]) filters.updatedOn = date;
			text = text.replace(/\s*updated:[<>]?(\S+)\s*/, " ");
		}
		match = text.match(/\bcreated:([<>]?)(yesterday|today)(\s|$)/);
		if (match) {
			const date = new Date();
			date.setHours(0, 0, 0, 0);
			if (match[2] === "yesterday") date.setDate(date.getDate() - 1);
			if (match[1] === "<") filters.createdBefore = date.getTime();
			if (match[1] === ">") filters.createdAfter = date.getTime();
			if (!match[1]) filters.createdOn = date;
			text = text.replace(/\s*created:[<>]?(\S+)\s*/, " ");
		}

		filters.text = text.trim();

		return filters;
	};

	debouncedApplyQuery = debounce(this.fetchLogs, 250);

	renderResults = results => {
		if (results.length === 0) return null;

		return (
			<>
				{results.map(r => (
					<LogRow logEntry={r} />
				))}
			</>
		);
	};

	render() {
		return (
			<Dialog
				maximizable
				wide
				noPadding
				onMaximize={() => this.setState({ maximized: true })}
				onMinimize={() => this.setState({ maximized: false })}
				onClose={() => this.props.closePanel()}
			>
				<PanelHeader title="Logs">
					<SearchBar className="search-bar">
						<div className="search-input">
							<Icon name="search" className="search" />
							<input
								name="q"
								ref={ref => (this._searchInput = ref)}
								value={this.props.query}
								className="input-text control"
								type="text"
								onChange={e => this.props.setQuery(e.target.value)}
								placeholder="Search entity logs"
								autoFocus
							/>
						</div>
					</SearchBar>
				</PanelHeader>
				<div
					style={{
						height: this.state.maximized ? "calc(100vh - 100px)" : "calc(100vh - 200px)",
						overflow: "hidden",
					}}
				>
					<ScrollBox>
						<div
							className="channel-list vscroll"
							style={{ paddingTop: "10px", paddingLeft: "10px" }}
						>
							{this.state.totalItems > 0 && (
								<table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
									<tbody>
										{/* the first row sets the width of the columns with table-layout: fixed */}
										<tr style={{ height: "1px" }}>
											<td style={{ width: "40px", padding: "0" }}></td>
											<td style={{ width: "75%", padding: "0" }}></td>
											<td style={{ width: "25%", padding: "0" }}></td>
											<td style={{ width: "40px", padding: "0" }}></td>
										</tr>
										{this.renderResults(this.state.displayItems || [])}
									</tbody>
								</table>
							)}
							{!this.state.totalItems && (
								<div className="no-matches">No results match your search.</div>
							)}
						</div>
					</ScrollBox>
				</div>
			</Dialog>
		);
	}
}

const mapStateToProps = (state: CodeStreamState, _props): ConnectedProps => {
	const { context, session, users, repos } = state;

	return {
		entityGuid: context.currentObservabilityLogEntityGuid,
	};
};

export default withSearchableItems(
	connect(mapStateToProps, { closePanel, setUserPreference })(ObservabilityLogsPanel)
);
