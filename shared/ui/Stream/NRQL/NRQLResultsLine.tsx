import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

const COLOR_LINE_1 = "#8884d8";

const formatXAxisTime = time => {
	return new Date(time).toLocaleTimeString();
};

export const NRQLResultsLine = (props: { results: NRQLResult[] }) => {
	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={300} debounce={1}>
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
						<CartesianGrid strokeDasharray="3 3" />

						<XAxis
							tick={{ fontSize: 12 }}
							dataKey="endTimeSeconds"
							tickFormatter={formatXAxisTime}
						/>

						<YAxis tick={{ fontSize: 12 }} />

						<Line dataKey="count" fill={COLOR_LINE_1} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
