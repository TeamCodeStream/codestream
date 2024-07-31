import React, { useMemo, useState } from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import { GridWindow } from "../GridWindow";
import copy from "copy-to-clipboard";
import Icon from "../Icon";
import Tooltip from "../Tooltip";
import { isEmpty as _isEmpty } from "lodash-es";
import { validateAndConvertUnixTimestamp } from "./utils";

const MIN_COL_WIDTH = 200;
const MAX_COL_WIDTH = 450;
const MIN_ROW_HEIGHT = 100;

const cellStyle = {
	padding: "5px 4px 4px 4px",
	borderRight: "1px solid var(--base-border-color)",
	borderBottom: "1px solid var(--base-border-color)",
	fontFamily: "'Courier New', Courier, monospace",
};

interface Props {
	results: NRQLResult[];
	width: number | string;
	height: number | string;
	facet?: string | string[];
}

export const NRQLResultsTable = (props: Props) => {
	const [showCopyIcon, setShowCopyIcon] = useState<[number, number][]>([]);

	const results = useMemo(() => {
		if (!props.facet) return props.results;

		return props.results.map(result => {
			const { facet, ...rest } = result;

			if (Array.isArray(facet) && facet.length > 1) {
				const facetObj = facet.reduce((acc, value, index) => {
					if (props.facet && props.facet[index]) {
						acc[props.facet[index]] = value;
					}
					return acc;
				}, {});

				// Return the object with the rest of the properties and the mapped facet values
				return {
					...rest,
					...facetObj,
				};
			} else {
				// If facet is not an array with more than one element, remove it from results/display
				return rest;
			}
		});
	}, [props.results, props.facet]);

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

		const columnNames = Object.keys(gridData.resultsWithHeaders[rowIndex]);
		const columnName = columnNames[columnIndex];
		let value: string;
		const cellValue = rowArray[columnIndex];

		if (columnName.includes("timestamp")) {
			if (typeof cellValue === "number") {
				value = validateAndConvertUnixTimestamp(cellValue);
			} else {
				value = String(cellValue);
			}
		} else if (typeof cellValue === "string") {
			value = cellValue;
		} else if (typeof cellValue === "object" && cellValue !== null) {
			let keys = Object.keys(cellValue);
			let variableKey = parseInt(keys[0], 10);
			value = String(cellValue[variableKey]);
		} else {
			value = String(cellValue);
		}

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
				onMouseEnter={() => setShowCopyIcon([columnIndex, rowIndex])}
				onMouseLeave={() => setShowCopyIcon([])}
			>
				{rowIndex !== 0 ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							height: "100%",
							position: "relative",
						}}
					>
						<Tooltip placement="top" title={value} delay={2}>
							<div
								style={{
									cursor: "default",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								{value}
							</div>
						</Tooltip>
						{showCopyIcon[0] === columnIndex &&
							showCopyIcon[1] === rowIndex &&
							!_isEmpty(value) && (
								<Icon
									title="Copy"
									placement="bottom"
									name="copy"
									className="clickable icon"
									style={{
										position: "absolute",
										right: "0",
										top: "3px",
										background: "var(--app-background-color)",
									}}
									onClick={e => copy(value)}
								/>
							)}
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
		return rowCalcData.map(() => {
			return 35;
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
		let columnWidths = Object.entries(firstRowResults).map(([key, value]) => {
			const keyValue = typeof key === "string" ? key : String(key);
			const valueString = typeof value === "string" ? value : String(value);
			const columnToPass = keyValue.length > valueString.length ? keyValue : valueString;
			return calculateColumnWidth(columnToPass);
		});

		const sumColumnWidths = columnWidths.reduce((accumulator, currentValue) => {
			return accumulator + currentValue;
		}, 0);

		if (sumColumnWidths < Number(props.width)) {
			const targetWidth = Number(props.width) - 10;
			const difference = targetWidth - sumColumnWidths;
			const numberOfColumns = columnWidths.length;
			const addToEach = difference / numberOfColumns;

			columnWidths = columnWidths.map(width => width + addToEach);
		}

		return columnWidths;
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

	const gridData = useMemo(() => generateGridData(results), [results]);

	return (
		<>
			{results && results.length > 0 && (
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
