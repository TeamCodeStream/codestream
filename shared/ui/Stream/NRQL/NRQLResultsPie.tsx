import { NRQLResult } from "@codestream/protocols/agent";
import React, { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Colors, ColorsHash } from "./utils";
import { FacetTooltip } from "./FacetTooltip";

interface Props {
	results: NRQLResult[];
	/**
	 * the name of the facet (aka name, path, foo, bar). Not the property facet returned from the results,
	 * but the facet in the metadata that points to the name of the faceted property/ies
	 */
	facet: string[];
}

const truncate = (str: string, max: number) => {
	if (!str) return str;
	if (str.length >= max) return `${str.substring(0, max - 1)}${"\u2026"}`;
	return str;
};

export const NRQLResultsPie = (props: Props) => {
	const [showLegend, setShowLegend] = useState(false);
	const [activeIndex, setActiveIndex] = useState(null);

	const handleMouseEnter = index => {
		setActiveIndex(index);
	};

	const handleMouseLeave = () => {
		setActiveIndex(null);
	};
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

	const CustomLegend = ({ payload, facet }: { payload?: any[]; facet: string[] }) => (
		<div>
			{payload!.map((entry, index) => {
				const k = facet.length === 1 ? entry.payload[facet[0]] : entry.payload["facet"].join(", ");
				const key = truncate(k, 40);
				const borderBottomStyle =
					index === payload!.length - 1 ? "none" : "1px solid var(--base-border-color)";
				const isHighlighted = activeIndex === index;

				return (
					<div
						onMouseEnter={() => handleMouseEnter(index)}
						onMouseLeave={handleMouseLeave}
						key={`custom-legend--item-${index}`}
						style={{
							padding: "6px 0px",
							borderBottom: borderBottomStyle,
							opacity: isHighlighted ? 1 : 0.7,
							display: "flex",
							justifyContent: "space-between",
							color: isHighlighted ? "var(--text-color-highlight)" : "var(--text-color)",
						}}
					>
						<div>
							<span className="dot" style={{ color: entry.color, marginRight: "6px" }}>
								●
							</span>
							<span>{key}</span>
						</div>
						<div title={k}>{entry.payload.value}</div>
					</div>
				);
			})}
		</div>
	);

	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				{/* @TODO  use resize-detector height */}
				<ResponsiveContainer width="100%" height={400} debounce={1}>
					<PieChart width={500} height={400}>
						<Pie
							data={props.results}
							dataKey={dataKeys[0]} // Specify the data key to determine pie slices
							cx="42%" // Set the x-coordinate of the center of the pie
							cy="50%" // Set the y-coordinate of the center of the pie
							innerRadius={75} // Adjust the inner radius to make it a doughnut shape
							outerRadius={170} // Specify the outer radius of the pie
							fill="#8884d8" // Specify the fill/color of the pie slices
						>
							{/* Render labels */}
							{props.results.map((_, index) => {
								const color = ColorsHash[index % Colors.length];
								return (
									<Cell
										key={index}
										fill={color}
										onMouseEnter={() => handleMouseEnter(index)}
										onMouseLeave={handleMouseLeave}
										strokeWidth={activeIndex === index ? 2 : 0} // Highlight the segment by adjusting strokeWidth
										opacity={activeIndex !== null && activeIndex !== index ? 0.5 : 1} // Dim other segments when one is highlighted
									/>
								);
							})}
						</Pie>
						{!showLegend && <Tooltip content={<FacetTooltip facet={props.facet} />} />}
						{showLegend && (
							<Legend
								content={<CustomLegend facet={props.facet} />}
								fontSize={10}
								align="right"
								verticalAlign="middle"
								layout="vertical"
								wrapperStyle={{
									width: "45%",
									height: "80%",
								}}
							/>
						)}
					</PieChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
