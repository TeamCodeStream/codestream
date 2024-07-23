import React, { useState } from "react";
import {
	Line,
	LineChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip as ReTooltip,
	XAxis,
	YAxis,
	Legend,
} from "recharts";
import { NRQLResult } from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash-es";
import {
	ColorsHash,
	Colors,
	truncate,
	fillNullValues,
	getUniqueDataKeyAndFacetValues,
	formatXAxisTime,
	isMultiSelect,
	flattenResultsWithObjects,
} from "./utils";
import { EventTypeTooltip } from "./EventTypeTooltip";
import { EventTypeLegend } from "./EventTypeLegend";
import { FacetLineTooltip } from "./FacetLineTooltip";
import Tooltip from "../Tooltip";

export const LEFT_MARGIN_ADJUST_VALUE = 25;

const formatResultsForLineChart = (originalArray, uniqueFacets, dataKeys) => {
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

interface NRQLResultsLineProps {
	results: NRQLResult[];
	facet?: string[];
	eventType?: string;
	height?: number;
}

export const NRQLResultsLine: React.FC<NRQLResultsLineProps> = ({
	results,
	facet,
	eventType,
	height,
}) => {
	if (!results || results.length === 0) return null;
	const [activeDotKey, setActiveDotKey] = useState(undefined);
	const [activeIndex, setActiveIndex] = useState(undefined);

	const { dataKeys, uniqueFacetValues } = getUniqueDataKeyAndFacetValues(results, facet);
	const resultsForLineChart = formatResultsForLineChart(results, uniqueFacetValues, dataKeys);

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

	const queryIsMultiSelect = isMultiSelect(results);

	const FacetLineLegend = ({ payload }: { payload?: { dataKey: string; color: string }[] }) => {
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
		<div style={{ marginLeft: `-${LEFT_MARGIN_ADJUST_VALUE}px` }} className="histogram-chart">
			<div style={{ height: height, overflowY: "auto", overflowX: "hidden" }}>
				{_isEmpty(facet) && !queryIsMultiSelect && (
					<ResponsiveContainer width="100%" height={500} debounce={1}>
						{/* Non-facet, single line chart */}
						<LineChart
							width={500}
							height={300}
							data={flattenResultsWithObjects(results, dataKeys)}
							margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
						>
							<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
							<XAxis
								tick={{ fontSize: 11 }}
								dataKey="endTimeSeconds"
								tickFormatter={formatXAxisTime}
							/>
							<YAxis tick={{ fontSize: 11 }} />
							<ReTooltip content={<EventTypeTooltip eventType={eventType || "count"} />} />
							{dataKeys.map((_, index) => {
								const color = ColorsHash[index % Colors.length];
								return <Line key={_} dataKey={_} stroke={color} fill={color} dot={false} />;
							})}
							<Legend
								wrapperStyle={{ margin: "15px" }}
								content={<EventTypeLegend eventType={eventType} />}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
				{_isEmpty(facet) && queryIsMultiSelect && (
					<ResponsiveContainer width="100%" height={500} debounce={1}>
						{/* Non-facet, single line chart */}
						<LineChart
							width={500}
							height={300}
							data={results}
							margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
						>
							<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
							<XAxis
								tick={{ fontSize: 11 }}
								dataKey="endTimeSeconds"
								tickFormatter={formatXAxisTime}
							/>
							<YAxis tick={{ fontSize: 11 }} />
							<ReTooltip content={<FacetLineTooltip activeDotKey={activeDotKey} />} />
							{dataKeys.map((_, index) => {
								const color = ColorsHash[index % Colors.length];
								return (
									<Line
										key={_}
										dataKey={_}
										stroke={color}
										fill={color}
										dot={false}
										strokeOpacity={activeIndex === undefined ? 1 : activeIndex === index ? 1 : 0.5}
										activeDot={{
											onMouseOver: e => customMouseOver(_, index),
											onMouseLeave: e => customMouseLeave(),
										}}
									/>
								);
							})}
							<Legend content={<FacetLineLegend />} />
						</LineChart>
					</ResponsiveContainer>
				)}
				{!_isEmpty(facet) && (
					<ResponsiveContainer width="100%" height={500} debounce={1}>
						{/* facet, multiple line chart */}
						<LineChart width={500} height={300} data={resultsForLineChart}>
							<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
							<XAxis
								tick={{ fontSize: 11 }}
								dataKey="endTimeSeconds"
								tickFormatter={formatXAxisTime}
							/>
							<YAxis tick={{ fontSize: 11 }} />
							<ReTooltip content={<FacetLineTooltip activeDotKey={activeDotKey} />} />
							<Legend content={<FacetLineLegend />} />

							{Object.keys(resultsForLineChart[0]).map((key, index) =>
								key !== "endTimeSeconds" ? (
									<Line
										key={key}
										dataKey={key}
										stroke={ColorsHash[index % Colors.length]}
										fill={ColorsHash[index % Colors.length]}
										dot={false}
										strokeOpacity={activeIndex === undefined ? 1 : activeIndex === index ? 1 : 0.5}
										activeDot={{
											onMouseOver: e => customMouseOver(key, index),
											onMouseLeave: e => customMouseLeave(),
										}}
									/>
								) : null
							)}
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
};
