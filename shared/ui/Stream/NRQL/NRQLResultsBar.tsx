import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { CartesianGrid, ResponsiveContainer, YAxis, BarChart, Bar, Cell, Tooltip } from "recharts";
import { Colors } from "./utils";
import { CustomTooltip } from "./CustomTooltip";

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
						<YAxis tick={{ fontSize: 11 }} />
						<Tooltip content={<CustomTooltip facet={props.facet} />} />
						<Bar dataKey={keyName} fill="#8884d8">
							{results.map((entry, index) => (
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
