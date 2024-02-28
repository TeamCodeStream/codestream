import React, { useState } from "react";
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
import { isEmpty as _isEmpty } from "lodash-es";
import { ColorsHash, Colors } from "./utils";
import { EventTypeTooltip } from "./EventTypeTooltip";
import { EventTypeLegend } from "./EventTypeLegend";
import { FacetLineTooltip } from "./FacetLineTooltip";

export const LEFT_MARGIN_ADJUST_VALUE = 25;

const formatXAxisTime = time => {
	const date = new Date(time * 1000);
	return `${date.toLocaleTimeString()}`;
};

const processResults = results => {
	const result = results ? results[0] : undefined;
	const dataKeys = Object.keys(result || {}).filter(
		key => !["beginTimeSeconds", "endTimeSeconds", "facet", "name"].includes(key)
	);
	const uniqueFacetValues = [...new Set(results.map(obj => obj.facet))];
	return { dataKeys, uniqueFacetValues };
};

const createNewArray = (originalArray, uniqueFacets, dataKeys) => {
	const groupedByEndTime = {};

	uniqueFacets.forEach(facet => {
		groupedByEndTime[facet] = 0;
	});

	originalArray.forEach(obj => {
		const endTime = obj.endTimeSeconds;
		if (!groupedByEndTime.hasOwnProperty(endTime)) {
			groupedByEndTime[endTime] = {};
			uniqueFacets.forEach(facet => {
				groupedByEndTime[endTime][facet] = 0;
			});
		}
		groupedByEndTime[endTime][obj.facet] = obj[dataKeys[0]];
	});

	const newArray = Object.entries(groupedByEndTime).map(([endTime, facetValues]) => ({
		endTimeSeconds: endTime,
		...(facetValues as { [key: string]: number }),
	}));

	return newArray;
};

const fillNullValues = array => {
	array.forEach((obj, i) => {
		Object.keys(obj).forEach(key => {
			if (key !== "endTimeSeconds" && obj[key] === null) {
				let j = i - 1;
				while (j >= 0 && array[j][key] === null) j--;
				obj[key] = j >= 0 ? array[j][key] : 0;
			}
		});
	});
	return array;
};

export const NRQLResultsLine = ({ results, facet, eventType }) => {
	if (!results || results.length === 0) return null;
	const [activeDotKey, setActiveDotKey] = useState(undefined);

	const { dataKeys, uniqueFacetValues } = processResults(results);
	const newArray = createNewArray(results, uniqueFacetValues, dataKeys);
	const noNullNewArray = fillNullValues(newArray);

	const filteredArray = noNullNewArray.filter(obj =>
		Object.keys(obj).some(key => key !== "endTimeSeconds" && obj[key] !== undefined)
	);

	const customMouseOver = (e, key) => {
		setActiveDotKey(key);
	};

	const customMouseLeave = (e, key) => {
		setActiveDotKey(undefined);
	};

	return (
		<div style={{ marginLeft: `-${LEFT_MARGIN_ADJUST_VALUE}px` }} className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				{_isEmpty(facet) ? (
					<ResponsiveContainer width="100%" height={500} debounce={1}>
						<LineChart
							width={500}
							height={300}
							data={results}
							margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
						>
							<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
							<XAxis
								tick={{ fontSize: 11 }}
								dataKey="endTimeSeconds"
								tickFormatter={formatXAxisTime}
							/>
							<YAxis tick={{ fontSize: 11 }} />
							<ReTooltip content={<EventTypeTooltip eventType={eventType || "count"} />} />
							{dataKeys.map((_, index) => {
								const color = ColorsHash[index % Colors.length];
								return <Line key={_} dataKey={_} stroke={color} fill={color} dot={false} />;
							})}
							<Legend
								wrapperStyle={{ margin: "15px" }}
								content={<EventTypeLegend eventType={eventType} />}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<LineChart width={800} height={400} data={filteredArray}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							tick={{ fontSize: 11 }}
							dataKey="endTimeSeconds"
							tickFormatter={formatXAxisTime}
						/>
						<YAxis tick={{ fontSize: 11 }} />
						<ReTooltip content={<FacetLineTooltip activeDotKey={activeDotKey} />} />
						<Legend />
						{Object.keys(filteredArray[0]).map((key, index) =>
							key !== "endTimeSeconds" ? (
								<Line
									key={key}
									dataKey={key}
									stroke={ColorsHash[index % Colors.length]}
									fill={ColorsHash[index % Colors.length]}
									dot={false}
									activeDot={{
										onMouseOver: e => customMouseOver(e, key),
										onMouseLeave: e => customMouseLeave(e, key),
									}}
								/>
							) : null
						)}
					</LineChart>
				)}
			</div>
		</div>
	);
};
