import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { ResponsiveContainer, YAxis, XAxis, BarChart, Bar, Cell } from "recharts";
import { Colors, renameKeyToName } from "./utils";

interface Props {
	results: NRQLResult[];
	/**
	 * the name of the facet (aka name, path, foo, bar). Not the property facet returned from the results,
	 * but the facet in the metadata that points to the name of the faceted property/ies
	 */
	facet: string[];
	height: number;
}

// keyName defaults to count, and we have to match it to the numerical value returned from results
const normalizeDataToCount = arr => {
	return arr.map(obj => {
		const newObj = {};
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (key !== "facet" && key !== "name" && key !== "count" && key !== "number") {
					newObj["count"] = obj[key];
				} else {
					newObj[key] = obj[key];
				}
			}
		}
		return newObj;
	});
};

function checkForValidCountValue(arr) {
	const decimalRegex = /^[0-9]+(\.[0-9]+)?$/;

	for (let obj of arr) {
		if (!decimalRegex.test(obj.count)) {
			return false;
		}
	}
	return true;
}

export const NRQLResultsBar = (props: Props) => {
	const _results = renameKeyToName(props.results);

	// find the first key that has a value that's a number, fallback to count
	let keyName =
		(_results?.length
			? Object.keys(_results[0]).find(key => typeof _results[0][key] === "number")
			: "count") || "count";

	// In the case of uniqueCount, default keyname to count
	if (keyName && keyName.includes("uniqueCount")) {
		keyName = "count";
	}

	const results = normalizeDataToCount(_results);
	const isCountValidNumber = checkForValidCountValue(results);

	return (
		<div className="histogram-chart">
			<div style={{ height: props.height, overflowY: "auto" }}>
				<ResponsiveContainer width="100%" height={results.length * 55} debounce={1}>
					<BarChart
						width={500}
						height={results.length * 50}
						data={results}
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
						<XAxis
							hide
							type={isCountValidNumber ? "number" : "category"}
							tick={{ fontSize: 11 }}
							domain={[0, "dataMax"]}
						/>{" "}
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
							label={props => renderCustomLabel(props, keyName)}
							isAnimationActive={true}
							background={{
								fill: "var(--app-background-color-hover)",
								radius: 5,
							}}
						>
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

const renderCustomLabel = (props, dataKey) => {
	const { x, y, width, name, ...rest } = props;

	return (
		<text x={20} y={y - 10} fill={`var(--text-color)`} textAnchor="left" fontSize={13}>
			{name}
		</text>
	);
};
