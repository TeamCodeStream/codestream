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
			result[key] = hasKey(obj, key) ? obj[key] : "";
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
					color: rowIndex === 0 ? "var(--text-color-highlight)" : "default",
					fontWeight: rowIndex === 0 ? "bold" : "default",
				}}
			>
				{value}
			</div>
		);
	};

	const calculateColumnWidth = value => {
		return typeof value === "number"
			? Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, String(value).length + 150))
			: typeof value === "string"
			? Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, value.length + 150))
			: MIN_COL_WIDTH;
	};

	const calculateRowHeights = rowCalcData => {
		return rowCalcData.map(([index, longestLength, columnWidthValue]) => {
			let lengthOfString = longestLength * 11;
			const numLines = Math.ceil(lengthOfString / columnWidthValue);
			//@TODO, make this value dynamic
			const lineHeight = 22;
			const totalHeight = numLines * lineHeight;
			return totalHeight;
		});
	};

	const generateRowCalcData = (resultsWithHeaders, columnWidths) => {
		return resultsWithHeaders.map((obj, i) => {
			const values = Object.values(obj);
			const longestIndex = values.findIndex(
				value => String(value).length === Math.max(...values.map(val => String(val).length))
			);
			const longestLength = Math.max(...values.map(value => String(value).length));
			const updatedIndex = longestIndex < columnWidths.length ? longestIndex : 0;
			const columnWidthValue = columnWidths[updatedIndex] || 0;

			return [updatedIndex, longestLength, columnWidthValue];
		});
	};

	const calculateColumnWidths = firstRowResults => {
		return Object.entries(firstRowResults).map(([key, value]) => {
			return calculateColumnWidth(value);
		});
	};

	const generateGridData = results => {
		if (!results || results.length === 0) {
			return { columnWidths: [], columnCount: 0, resultsWithHeaders: [] };
		}

		const firstRowResults = results[0];
		const filledInResults = results.map(result =>
			fillMissingKeys(result, Object.keys(firstRowResults))
		);
		const columnCount = Object.keys(firstRowResults).length;
		const columnHeaders = Object.keys(firstRowResults);
		const resultsWithHeaders = [columnHeaders, ...filledInResults];
		const columnWidths = calculateColumnWidths(firstRowResults);
		const rowCalcData = generateRowCalcData(resultsWithHeaders, columnWidths);
		const rowHeights = calculateRowHeights(rowCalcData);

		return { columnWidths, columnCount, columnHeaders, resultsWithHeaders, rowHeights };
	};

	const gridData = useMemo(() => generateGridData(props.results), [props.results]);

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
