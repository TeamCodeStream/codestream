import React, { useState } from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import {
	ResponsiveContainer,
	YAxis,
	XAxis,
	BarChart,
	Bar,
	Tooltip as ReTooltip,
	Legend,
} from "recharts";
import { ColorsHash, Colors } from "./utils";
import Tooltip from "../Tooltip";
import { StackedBarTooltip } from "./StackedBarTooltip";

interface Props {
	results: NRQLResult[];
	facet: string[];
	height: number;
	eventType?: string;
}

const formatXAxisTime = time => {
	const date = new Date(time * 1000);
	return `${date.toLocaleTimeString()}`;
};

const getUniqueDataKeyAndFacetValues = (results, facet) => {
	const result = results ? results[0] : undefined;

	const defaultFilterKeys = ["beginTimeSeconds", "endTimeSeconds", "facet"];
	const filterKeys = defaultFilterKeys.concat(facet);

	const dataKeys = Object.keys(result || {}).filter(key => !filterKeys.includes(key));
	const uniqueFacetValues: string[] = [...new Set<string>(results.map(obj => obj.facet))];
	return { dataKeys, uniqueFacetValues };
};

const formatResultsForStackedBarChart = (originalArray, uniqueFacets, dataKeys) => {
	const groupedByEndTime = {};

	uniqueFacets.forEach(facet => {
		groupedByEndTime[facet] = 0;
	});

	originalArray.forEach(obj => {
		const endTime = obj.endTimeSeconds;
		if (!groupedByEndTime.hasOwnProperty(endTime)) {
			groupedByEndTime[endTime] = {};
			uniqueFacets.forEach(facet => {
				groupedByEndTime[endTime][facet] = 0;
			});
		}
		groupedByEndTime[endTime][obj.facet] = obj[dataKeys[0]];
	});

	const newArray = Object.entries(groupedByEndTime).map(([endTime, facetValues]) => ({
		endTimeSeconds: endTime,
		...(facetValues as { [key: string]: number }),
	}));

	return fillNullValues(newArray);
};

const fillNullValues = array => {
	array.forEach((obj, i) => {
		Object.keys(obj).forEach(key => {
			if (key !== "endTimeSeconds" && obj[key] === null) {
				let j = i - 1;
				while (j >= 0 && array[j][key] === null) j--;
				obj[key] = j >= 0 ? array[j][key] : 0;
			}
		});
	});
	return array.filter(obj =>
		Object.keys(obj).some(key => key !== "endTimeSeconds" && obj[key] !== undefined)
	);
};

const truncate = (str: string, max: number) => {
	if (!str) return str;
	if (str.length >= max) return `${str.substring(0, max - 1)}${"\u2026"}`;
	return str;
};

export const NRQLResultsStackedBar = (props: Props) => {
	const { results, eventType, facet } = props;
	if (!results || results.length === 0) return null;
	const [activeDotKey, setActiveDotKey] = useState(undefined);
	const [activeIndex, setActiveIndex] = useState(undefined);

	const { dataKeys, uniqueFacetValues } = getUniqueDataKeyAndFacetValues(results, facet);
	const resultsForStackedBarChart = formatResultsForStackedBarChart(
		results,
		uniqueFacetValues,
		dataKeys
	);

	const customMouseOver = (key, index) => {
		setActiveIndex(index);
		setActiveDotKey(key);
	};

	const customMouseLeave = () => {
		setActiveDotKey(undefined);
		setActiveIndex(undefined);
	};

	const handleMouseEnter = index => {
		setActiveIndex(index);
	};

	const handleMouseLeave = () => {
		setActiveIndex(undefined);
	};

	const StackedBarLegend = ({ payload }: { payload?: { dataKey: string; color: string }[] }) => {
		return (
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					flexDirection: "row",
					alignContent: "flex-start",
					paddingLeft: `40px`,
				}}
			>
				{payload!.map((entry, index) => {
					const key = truncate(entry.dataKey, 40);
					const isHighlighted = activeIndex === index;

					return (
						<Tooltip placement="top" delay={1} title={entry.dataKey}>
							<div
								onMouseEnter={() => handleMouseEnter(index)}
								onMouseLeave={handleMouseLeave}
								key={`custom-legend--item-${index}`}
								style={{
									opacity: isHighlighted ? 1 : 0.7,
									color: isHighlighted ? "var(--text-color-highlight)" : "var(--text-color)",
									padding: "4px",
									cursor: "pointer",
								}}
							>
								<div>
									<span
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											maxWidth: "180px",
											display: "inline-block",
										}}
									>
										<span className="dot" style={{ color: entry.color, marginRight: "6px" }}>
											●
										</span>
										{key}
									</span>
								</div>
							</div>
						</Tooltip>
					);
				})}
			</div>
		);
	};

	return (
		<div className="histogram-chart">
			<div style={{ height: props.height, overflowY: "auto" }}>
				<ResponsiveContainer width="99%" height={500} debounce={1}>
					<BarChart
						width={500}
						height={400}
						data={resultsForStackedBarChart}
						margin={{
							top: 20,
							right: 0,
							left: 0,
							bottom: 5,
						}}
					>
						<XAxis
							tick={{ fontSize: 11 }}
							dataKey="endTimeSeconds"
							tickFormatter={formatXAxisTime}
						/>
						<YAxis tick={{ fontSize: 11 }} />
						<ReTooltip
							cursor={{ fill: "transparent" }}
							content={<StackedBarTooltip activeDotKey={activeDotKey} />}
						/>
						<Legend content={<StackedBarLegend />} />

						{uniqueFacetValues.map((facet, facetIndex) => {
							const color = ColorsHash[facetIndex % Colors.length];
							return (
								<Bar
									key={facet}
									dataKey={facet}
									stackId="a"
									fill={color}
									onMouseOver={e => customMouseOver(facet, facetIndex)}
									onMouseLeave={e => customMouseLeave()}
									fillOpacity={activeIndex === undefined ? 1 : activeIndex === facetIndex ? 1 : 0.5}
								/>
							);
						})}
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
