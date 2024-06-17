import React, { useState } from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import {
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis,
	Legend,
	Tooltip as ReTooltip,
	AreaChart,
	Area,
} from "recharts";
import { ColorsHash, Colors, isMultiSelect, truncate } from "./utils";
import { EventTypeTooltip } from "./EventTypeTooltip";
import { EventTypeLegend } from "./EventTypeLegend";
import { LEFT_MARGIN_ADJUST_VALUE } from "./NRQLResultsLine";
import Tooltip from "../Tooltip";
import { FacetLineTooltip } from "./FacetLineTooltip";

const formatXAxisTime = time => {
	return new Date(time).toLocaleTimeString();
};

interface Props {
	results: NRQLResult[];
	eventType?: string;
}

export const NRQLResultsArea = (props: Props) => {
	const result = props.results ? props.results[0] : undefined;
	const dataKeys = Object.keys(result || {}).filter(
		_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds"
	);

	if (!props.results || props.results.length === 0) return null;
	const [activeDotKey, setActiveDotKey] = useState(undefined);
	const [activeIndex, setActiveIndex] = useState(undefined);

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

	const queryIsMultiSelect = isMultiSelect(props.results);

	// this is similar to FacetLineLegend from line charts, but I like the somewhat
	// redundant code here because stylistically these can differ, and its also
	// easier to keep the setState callback functions contained within a single functional
	// component
	const MultiSelectAreaLegend = ({
		payload,
	}: {
		payload?: { dataKey: string; color: string }[];
	}) => {
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
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={500} debounce={1}>
					<AreaChart
						width={500}
						height={300}
						data={props.results}
						margin={{
							top: 5,
							right: 0,
							left: 0,
							bottom: 5,
						}}
					>
						{!queryIsMultiSelect && (
							<>
								<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
								<XAxis
									tick={{ fontSize: 11 }}
									dataKey="endTimeSeconds"
									tickFormatter={formatXAxisTime}
								/>
								<YAxis tick={{ fontSize: 11 }} />
								<ReTooltip
									content={
										<EventTypeTooltip
											eventType={props.eventType || "count"}
											timeRangeDisplay={true}
										/>
									}
								/>

								{dataKeys.map((_, index) => {
									const color = ColorsHash[index % Colors.length];
									return <Area dataKey={_} stroke={color} fill={color} />;
								})}
								<Legend
									wrapperStyle={{ margin: "15px" }}
									content={<EventTypeLegend eventType={props.eventType} />}
								/>
							</>
						)}
						{queryIsMultiSelect && (
							<>
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
										<Area
											dataKey={_}
											stroke={color}
											fill={color}
											strokeOpacity={
												activeIndex === undefined ? 1 : activeIndex === index ? 1 : 0.5
											}
											activeDot={{
												onMouseOver: e => customMouseOver(_, index),
												onMouseLeave: e => customMouseLeave(),
											}}
										/>
									);
								})}
								<Legend wrapperStyle={{ margin: "15px" }} content={<MultiSelectAreaLegend />} />
							</>
						)}
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
