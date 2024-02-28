import { GetNRQLRecentQueriesType, NRQLRecentQuery } from "@codestream/protocols/agent";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect, useState } from "react";
import { OptionProps, components } from "react-select";
import { AsyncPaginate, reduceGroupedOptions } from "react-select-async-paginate";
import styled from "styled-components";

const OptionName = styled.div`
	color: var(--text-color);
	white-space: normal;
	border: 1px solid #444;
	border-radius: 1px;
	margin: 5px;
	padding: 5px;
	background: #000;
`;

const AccountName = styled.span`
	font-size: 0.7em;
	color: var(--text-color-info-muted);
`;

const Query = styled.span`
	font-size: 0.9em;
`;

const Option = (props: OptionProps) => {
	const children = <>{props.data?.label}</>;
	return <components.Option {...props} children={children} />;
};

export const RecentQueries = (props: {
	onSelect: (e: { query: string; accounts: { id: number; name: string }[] }) => void;
	lastRunTimestamp?: number;
}) => {
	const [queries, setQueries] = useState<NRQLRecentQuery[]>([]);
	let recentQueriesPromise;

	useEffect(() => {
		// if this changes we re-fetch
		if (props.lastRunTimestamp) {
			fetchRecentQueries();
		}
	}, [props.lastRunTimestamp]);

	useDidMount(() => {
		fetchRecentQueries();
	});

	const fetchRecentQueries = () => {
		recentQueriesPromise = HostApi.instance
			.send(GetNRQLRecentQueriesType, {})
			.then(response => {
				setQueries(response.items);
			})
			.catch(ex => {
				console.error(ex);
			});
	};

	const optionsPerPage = 20;
	const [selectedValue, setSelectedValue] = useState(null);

	/**
	 * Try to match the search term on a query. If there's a match, provide the position
	 *
	 * @param source the nrql query
	 * @param searchValue the user's search term
	 * @returns
	 */
	const indexOfWithMatchLength = (source: string, searchValue) => {
		// account for searching for 0
		if (searchValue === "" || searchValue == null) return undefined;

		const regex = new RegExp(searchValue, "i");
		const match = source.match(regex);

		if (match) {
			return { index: match.index, length: match[0].length };
		}

		return undefined;
	};

	const loadOptions = async (
		search: string,
		_loadedOptions,
		additional: { page: number },
		key?: string
	) => {
		await recentQueriesPromise;
		const searchLowered = search ? search.toLowerCase() : search;
		// first try to attach a match onto the collection
		const filtered = queries
			.map(_ => {
				return {
					..._,
					match: indexOfWithMatchLength(_.query, searchLowered),
				};
			})
			// then apply a formatted label that highlights the search matches (if any)
			.map(_ => {
				const match = _.match;
				let labelQuery;
				if (match) {
					labelQuery = (
						<Query
							dangerouslySetInnerHTML={{
								__html: _.query.replace(new RegExp(`(${search})`, "ig"), `<strong>$1</strong>`),
							}}
						></Query>
					);
				} else {
					labelQuery = <Query>{_.query}</Query>;
				}
				return {
					match: match,
					value: _,
					dayString: _.dayString,
					label: (
						<div>
							<OptionName>
								<AccountName>
									Accounts:{" "}
									{_.accounts
										.map(_ => {
											return `${_.id} - ${_.name}`;
										})
										.join(", ")}
								</AccountName>
								<br />
								{labelQuery}
							</OptionName>
						</div>
					),
				};
			})
			// return matches if there's a search term
			.filter(_ => {
				return search ? _.match : true;
			})
			// we use the dayString to group by in the dropdown
			.map(_ => {
				return {
					label: _.label,
					dayString: _.dayString,
					value: _.value,
				};
			});

		const mapTypeToIndex = new Map();

		const result: Array<{
			label: string;
			options: any[];
		}> = [];

		filtered.forEach(option => {
			const { dayString } = option;

			if (mapTypeToIndex.has(dayString)) {
				const index = mapTypeToIndex.get(dayString);
				result[index].options.push(option);
			} else {
				const index = result.length;
				mapTypeToIndex.set(dayString, index);
				result.push({
					label: `${dayString}`,
					options: [option],
				});
			}
		});
		return {
			options: result,
			hasMore: queries.length > additional.page * optionsPerPage,
			additional: {
				page: additional.page + 1,
			},
			key: props.lastRunTimestamp,
		};
	};

	return (
		<div style={{ width: "200px", marginLeft: "10px" }}>
			<AsyncPaginate
				id="input-recent-queries-autocomplete"
				name="account-autocomplete"
				classNamePrefix="react-select"
				key={props.lastRunTimestamp}
				reduceOptions={reduceGroupedOptions}
				loadOptions={loadOptions}
				closeMenuOnSelect={true}
				additional={{
					page: 1,
				}}
				styles={{
					menu: provided => ({
						...provided,
						// Set the desired width here
						width: "400px",
						// align the menu to the right
						right: "0",
						left: "auto",
					}),
					dropdownIndicator: provided => ({
						...provided,
						// Hide the down chevron
						// display: "none",
					}),
				}}
				value={selectedValue}
				debounceTimeout={750}
				placeholder={`Recent queries`}
				onChange={e => {
					setSelectedValue(null);
					if (props.onSelect) {
						// value is the value
						props.onSelect(e.value);
					}
				}}
				components={{ Option }}
				tabIndex={1}
				autoFocus={false}
				isClearable={false}
			/>
		</div>
	);
};
