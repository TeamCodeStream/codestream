import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { CartesianGrid, ResponsiveContainer, XAxis, YAxis, BarChart, Bar, Legend } from "recharts";

const COLOR_LINE_1 = "#8884d8";

export const NRQLResultsBar = (props: { results: NRQLResult[] }) => {
	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={300} debounce={1}>
					<BarChart
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
						<XAxis tick={{ fontSize: 11 }} />
						<YAxis tick={{ fontSize: 11 }} />

						<Bar dataKey="count" fill={COLOR_LINE_1} />
						<Legend align="center" fontSize={10} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
