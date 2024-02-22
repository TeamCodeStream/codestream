import React from "react";
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
import { ColorsHash, Colors } from "./utils";
import { EventTypeTooltip } from "./EventTypeTooltip";
import { EventTypeLegend } from "./EventTypeLegend";
import { LEFT_MARGIN_ADJUST_VALUE } from "./NRQLResultsLine";

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
						<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
						<XAxis
							tick={{ fontSize: 11 }}
							dataKey="endTimeSeconds"
							tickFormatter={formatXAxisTime}
						/>
						<YAxis tick={{ fontSize: 11 }} />
						<ReTooltip
							content={
								<EventTypeTooltip eventType={props.eventType || "count"} timeRangeDisplay={true} />
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
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
