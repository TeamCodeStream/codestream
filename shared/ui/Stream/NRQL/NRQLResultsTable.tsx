import React, { useMemo } from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { GridWindow } from "../GridWindow";

const MIN_COL_WIDTH = 140;
const MAX_COL_WIDTH = 400;
const MIN_ROW_HEIGHT = 100;

const cellStyle = {
	padding: "4px",
	borderRight: "1px solid var(--base-border-color)",
	borderBottom: "1px solid var(--base-border-color)",
	fontFamily: "'Courier New', Courier, monospace",
};

interface Props {
	results: NRQLResult[];
	width: number | string;
	height: number | string;
}

export const NRQLResultsTable = (props: Props) => {
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

		//@TODO - for later use, columnName will be "timestamp" or "name", etc.
		// const columnNames = Object.keys(gridData.resultsWithHeaders[rowIndex]);
		// const columnName = columnNames[columnIndex];
		// console.warn("columnName", columnName);

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
					wordBreak: rowIndex === 0 ? "break-word" : "normal",
				}}
			>
				{rowIndex !== 0 ? (
					<div style={{ display: "flex", alignItems: "center", height: "100%" }}>
						<div style={{ wordBreak: "break-word" }}>{value}</div>
					</div>
				) : (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: 4,
							right: 4,
							transform: "translateY(-50%)",
						}}
					>
						{value}
					</div>
				)}
			</div>
		);
	};

	const calculateColumnWidth = (value: string): number => {
		return stringLengthInPixels(value);
	};

	const stringLengthInPixels: (str: string) => number = (function () {
		const ctx = document.createElement("canvas").getContext("2d");
		if (ctx) {
			ctx.font = "13px monospace";
			return function (str: string) {
				const stringLengthInPixels = Math.round(ctx.measureText(str).width) + 20;
				return Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, stringLengthInPixels));
			};
		}
		return function (str: string) {
			return MIN_COL_WIDTH;
		};
	})();

	const calculateRowHeights = rowCalcData => {
		return rowCalcData.map(([index, longestLength, columnWidthValue]) => {
			let lengthOfString = longestLength * 9;
			const numLines = Math.ceil(lengthOfString / columnWidthValue);
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

	const calculateColumnWidths = (firstRowResults: { [key: string]: string | number }) => {
		return Object.entries(firstRowResults).map(([key, value]) => {
			const keyValue = typeof key === "string" ? key : String(key);
			const valueString = typeof value === "string" ? value : String(value);
			const columnToPass = keyValue.length > valueString.length ? keyValue : valueString;
			return calculateColumnWidth(columnToPass);
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
