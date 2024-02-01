import React, { useMemo } from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { GridWindow } from "../GridWindow";

const MIN_COL_WIDTH = 100;
const MAX_COL_WIDTH = 400;
const MIN_ROW_HEIGHT = 100;

const cellStyle = {
	wordBreak: "break-word",
	padding: "4px",
	borderRight: "1px solid var(--base-border-color)",
	borderBottom: "1px solid var(--base-border-color)",
	fontFamily: "'Courier New', Courier, monospace",
	// backgroundColor: "var(--app-background-color)",
};

export const NRQLResultsTable = (props: {
	results: NRQLResult[];
	width: number | string;
	height: number | string;
}) => {
	const hasKey = (obj, key) => {
		return obj.hasOwnProperty(key);
	};

	const fillMissingKeys = (obj, referenceKeys) => {
		const result = {};

		referenceKeys.forEach(key => {
			result[key] = hasKey(obj, key) ? obj[key] : ""; // Use existing value or empty string
		});

		return result;
	};

	const Cell = ({ columnIndex, rowIndex, style }) => {
		const rowArray = Object.values(gridData.resultsWithHeaders[rowIndex]);
		const value = rowArray[columnIndex];

		return (
			<div
				style={{
					...style,
					...cellStyle,
					borderLeft: columnIndex === 0 ? "1px solid var(--base-border-color)" : "none",
					backgroundColor:
						rowIndex === 0 ? "var(--app-background-color-hover)" : "var(--app-background-color)",
					borderTop: rowIndex === 0 ? "1px solid var(--base-border-color)" : "none",
				}}
			>
				{value}
			</div>
		);
	};

	const gridData = useMemo(() => {
		if (!props.results || props.results.length === 0) {
			return { columnWidths: [], columnCount: 0, resultsWithHeaders: [] };
		}

		const firstRowResults = props.results[0];
		const filledInResults = props.results;
		const columnCount = Object.keys(firstRowResults).length;
		const columnHeaders = Object.keys(firstRowResults);

		for (let i = 1; i < filledInResults.length; i++) {
			filledInResults[i] = fillMissingKeys(filledInResults[i], columnHeaders);
		}

		const resultsWithHeaders = [columnHeaders, ...filledInResults];

		const columnWidths = Object.entries(firstRowResults).map(([key, value]) => {
			const columnWidth =
				typeof value === "number"
					? Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, String(value).length + 130))
					: typeof value === "string"
					? Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, value.length + 130))
					: MIN_COL_WIDTH;

			return columnWidth;
		});

		// rowCalcData =
		// [
		// 	[indexOfLongestRow, lengthOfString, widthOfCell]
		// ]
		const rowCalcData = resultsWithHeaders.map((obj, i) => {
			const values = Object.values(obj);
			const longestIndex = values.findIndex(
				value => String(value).length === Math.max(...values.map(val => String(val).length))
			);
			const longestLength = Math.max(...values.map(value => String(value).length));
			const updatedIndex = longestIndex < columnWidths.length ? longestIndex : 0;
			const columnWidthValue = columnWidths[updatedIndex] || 0;

			return [updatedIndex, longestLength, columnWidthValue];
		});

		const rowHeights = rowCalcData.map(([index, longestLength, columnWidthValue]) => {
			let lengthOfString = longestLength * 11;
			const numLines = Math.ceil(lengthOfString / columnWidthValue);

			const lineHeight = 22;
			const totalHeight = numLines * lineHeight;
			return totalHeight;
		});

		return { columnWidths, columnCount, columnHeaders, resultsWithHeaders, rowHeights };
	}, [props.results]);

	return (
		<>
			{props.results && props.results.length > 0 && (
				<>
					<GridWindow
						columnCount={gridData.columnCount}
						columnWidth={index => gridData.columnWidths[index]}
						height={props.height}
						rowCount={gridData.resultsWithHeaders.length}
						rowHeight={index =>
							gridData?.rowHeights ? gridData?.rowHeights[index] : [MIN_ROW_HEIGHT]
						}
						width={props.width}
					>
						{Cell}
					</GridWindow>
				</>
			)}
		</>
	);
};
