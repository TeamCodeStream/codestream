import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const colorHash = {
	0: "#e6b223",
	1: "#9558af",
	2: "#8884d8",
	3: "#7aa7d2",
	4: "#84d888",
	5: "#d2d27a",
	6: "#d88884",
	7: "#7ad2a7",
	8: "#d27aa7",
	9: "#a77ad2",
};

export const NRQLResultsPie = (props: { results: NRQLResult[] }) => {
	const result = props.results ? props.results[0] : undefined;
	const dataKeys = Object.keys(result || {}).filter(
		_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds"
	);
	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={400} debounce={1}>
					<PieChart width={500} height={400}>
						<Pie
							data={props.results}
							dataKey="count" // Specify the data key to determine pie slices
							cx="50%" // Set the x-coordinate of the center of the pie
							cy="50%" // Set the y-coordinate of the center of the pie
							outerRadius={80} // Specify the outer radius of the pie
							fill="#8884d8" // Specify the fill/color of the pie slices
							label // Enable labels on the pie slices
						>
							{/* Render labels */}
							{dataKeys.map((_, index) => {
								const color = colorHash[index % 10];
								return <Cell key={index} fill={color} />;
							})}
						</Pie>
						<Legend layout="horizontal" verticalAlign="bottom" align="center" fontSize={10} />
					</PieChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
