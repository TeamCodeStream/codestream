import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { ResponsiveContainer, YAxis, XAxis, BarChart, Bar, Cell } from "recharts";
import { Colors } from "./utils";

interface Props {
	results: NRQLResult[];
	/**
	 * the name of the facet (aka name, path, foo, bar). Not the property facet returned from the results,
	 * but the facet in the metadata that points to the name of the faceted property/ies
	 */
	facet: string[];
	height: number;
}

export const NRQLResultsBar = (props: Props) => {
	const results = props.results;
	// find the first key that has a value that's a number, fallback to count
	const keyName =
		(results?.length
			? Object.keys(results[0]).find(key => {
					return typeof results[0][key] === "number";
			  })
			: "count") || "count";

	return (
		<div className="histogram-chart">
			<div style={{ height: props.height, overflowY: "auto" }}>
				<ResponsiveContainer width="100%" height={props.results.length * 55} debounce={1}>
					<BarChart
						width={500}
						height={props.results.length * 50}
						data={props.results}
						layout="vertical"
						margin={{
							top: 20,
							right: 0,
							left: 20,
							bottom: 5,
						}}
						barCategoryGap={20}
						barGap={5}
					>
						<XAxis hide type="number" tick={{ fontSize: 11 }} domain={[0, "dataMax"]} />{" "}
						<YAxis
							dataKey={keyName}
							type="category"
							orientation="right"
							axisLine={false}
							tickLine={false}
						/>
						<Bar
							dataKey={keyName}
							fill="#8884d8"
							radius={[5, 5, 5, 5]}
							barSize={10}
							label={renderCustomLabel}
							isAnimationActive={true}
							background={{
								fill: "var(--app-background-color-hover)",
								radius: 5,
							}}
						>
							{props.results.map((entry, index) => (
								<Cell
									key={
										entry[
											props.facet ? (props.facet.length === 1 ? props.facet[0] : "facet") : "facet"
										]
									}
									fill={Colors[index % Colors.length]}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
const renderCustomLabel = props => {
	const { x, y, width, value, name } = props;

	return (
		<text x={20} y={y - 10} fill={`var(--text-color)`} textAnchor="left" fontSize={13}>
			{name}
		</text>
	);
};
