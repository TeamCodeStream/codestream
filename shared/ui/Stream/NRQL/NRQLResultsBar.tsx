import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import {
	ResponsiveContainer,
	YAxis,
	XAxis,
	BarChart,
	Bar,
	Cell,
	ReferenceLine,
} from "recharts";
import { Colors } from "./utils";
import { LEFT_MARGIN_ADJUST_VALUE } from "./NRQLResultsLine";

interface Props {
	results: NRQLResult[];
	/**
	 * the name of the facet (aka name, path, foo, bar). Not the property facet returned from the results,
	 * but the facet in the metadata that points to the name of the faceted property/ies
	 */
	facet: string[];
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
		<div style={{ marginLeft: `-${LEFT_MARGIN_ADJUST_VALUE}px` }} className="histogram-chart">
			<div style={{ height: "700px", overflowY: "auto" }}>
				<ResponsiveContainer width="100%" height={props.results.length * 55} debounce={1}>
					<BarChart
						width={500}
						height={props.results.length * 50}
						data={props.results}
						layout="vertical"
						margin={{
							top: 20,
							right: 30,
							left: 30, // Increase left margin to accommodate the labels
							bottom: 5,
						}}
						barCategoryGap={20} // Adjust the gap between each category of bars
						barGap={5} // Adjust the gap between bars within the same category
					>
						<XAxis hide type="number" tick={{ fontSize: 11 }} domain={[0, "dataMax + 30"]} />{" "}
						{/* Adjust domain */}
						<YAxis
							dataKey={keyName}
							type="category"
							orientation="right"
							axisLine={false}
							tickLine={false}
						/>{" "}
						{/* Hide Y-axis line and tick lines */}
						{/* <Tooltip content={<FacetTooltip facet={props.facet} />} /> */}
						<Bar
							dataKey={keyName}
							fill="#8884d8"
							radius={[5, 5, 5, 5]} // Sets rounded corners for all corners
							barSize={10} // Adjust the width of the bars
							label={renderCustomLabel}
							isAnimationActive={false}
							background={{ fill: "var(--app-background-color-hover)" }}
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
						<ReferenceLine y={0} stroke="#eee" strokeWidth={2} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
const renderCustomLabel = props => {
	const { x, y, width, value, name } = props;

	return (
		<text x={30} y={y - 10} fill={`var(--text-color)`} textAnchor="left" fontSize={13}>
			{name}
		</text>
	);
};
