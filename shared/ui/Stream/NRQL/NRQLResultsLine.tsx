import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
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
import { ColorsHash, Colors } from "./utils";
import { EventTypeTooltip } from "./EventTypeTooltip";
import { EventTypeLegend } from "./EventTypeLegend";

const formatXAxisTime = time => {
	return new Date(time).toLocaleTimeString();
};

export const LEFT_MARGIN_ADJUST_VALUE = 25;

interface Props {
	results: NRQLResult[];
	/**
	 * the name of the facets (aka name, path, foo, bar). Not the property facet returned from the results,
	 * but the facet in the metadata that points to the name of the faceted property/ies
	 */
	facet?: string[];
	eventType?: string;
}

export const NRQLResultsLine = (props: Props) => {
	const result = props.results ? props.results[0] : undefined;
	const dataKeys = Object.keys(result || {}).filter(
		_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds"
	);
	return (
		<div style={{ marginLeft: `-${LEFT_MARGIN_ADJUST_VALUE}px` }} className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={500} debounce={1}>
					<LineChart
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
						<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />

						<XAxis
							tick={{ fontSize: 11 }}
							dataKey="endTimeSeconds"
							tickFormatter={formatXAxisTime}
						/>

						<YAxis tick={{ fontSize: 11 }} />
						<ReTooltip content={<EventTypeTooltip eventType={props.eventType || "count"} />} />
						{dataKeys.map((_, index) => {
							const color = ColorsHash[index % Colors.length];
							return <Line dataKey={_} stroke={color} fill={color} dot={false} />;
						})}
						<Legend
							wrapperStyle={{ margin: "15px" }}
							content={<EventTypeLegend eventType={props.eventType} />}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
