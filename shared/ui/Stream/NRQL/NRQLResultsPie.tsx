import { NRQLResult } from "@codestream/protocols/agent";
import React, { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Colors, ColorsHash } from "./utils";
import { CustomTooltip } from "./CustomTooltip";

interface Props {
	results: NRQLResult[];
	/**
	 * the name of the facet (aka name, path, foo, bar). Not the property facet returned from the results,
	 * but the facet in the metadata that points to the name of the faceted property/ies
	 */
	facet: string[];
}

const truncate = (str: string, max: number) => {
	// can't bundle import { truncate } from "@codestream/utils/system/string"; ??????

	if (!str) return str;
	if (str.length >= max) return `${str.substring(0, max - 1)}${"\u2026"}`;
	return str;
};

const CustomLegend = ({ payload, facet }: { payload?: any[]; facet: string[] }) => (
	<ul className="custom-legend">
		{payload!.map((entry, index) => {
			const k = facet.length === 1 ? entry.payload[facet[0]] : entry.payload["facet"].join(", ");
			const key = truncate(k, 40);
			return (
				<li key={`custom-legend--item-${index}`}>
					<span className="dot" style={{ color: entry.color }} title={k}>
						{key} {" - "} {entry.payload.value}
					</span>
				</li>
			);
		})}
	</ul>
);

export const NRQLResultsPie = (props: Props) => {
	const [showLegend, setShowLegend] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			setShowLegend(window.innerWidth > 768);
		};

		window.addEventListener("resize", handleResize);
		handleResize(); // Initial call

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const result = props.results ? props.results[0] : undefined;
	const dataKeys = Object.keys(result || {}).filter(
		_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds" && _ !== "facet"
	);
	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={400} debounce={1}>
					<PieChart width={500} height={400}>
						<Pie
							data={props.results}
							dataKey={dataKeys[0]} // Specify the data key to determine pie slices
							cx="50%" // Set the x-coordinate of the center of the pie
							cy="50%" // Set the y-coordinate of the center of the pie
							outerRadius={80} // Specify the outer radius of the pie
							fill="#8884d8" // Specify the fill/color of the pie slices
							label // Enable labels on the pie slices
						>
							{/* Render labels */}
							{props.results.map((_, index) => {
								const color = ColorsHash[index % Colors.length];
								return <Cell key={index} fill={color} />;
							})}
						</Pie>
						<Tooltip content={<CustomTooltip facet={props.facet} />} />
						{showLegend && (
							<Legend
								content={<CustomLegend facet={props.facet} />}
								fontSize={10}
								align="right"
								verticalAlign="middle"
								layout="vertical"
								wrapperStyle={{
									padding: "0 2rem",
									height: "80%",
									overflow: "auto",
								}}
							/>
						)}
					</PieChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
