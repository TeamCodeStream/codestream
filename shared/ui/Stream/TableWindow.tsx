import React, { useState, useRef, useCallback, useEffect } from "react";
import { VariableSizeList as List } from "react-window";
import styled from "styled-components";

interface TableWindowProps {
	itemCount: number;
	itemData?: JSX.Element[];
	width?: string | number;
	height?: string | number;
	currentShowSurroundingIndex?: number;
}

export const TableWindow = (props: TableWindowProps) => {
	const listRef = useRef();
	const sizeMap = useRef({});
	const setSize = useCallback((index, size) => {
		sizeMap.current = { ...sizeMap.current, [index]: size };
		//@ts-ignore
		listRef.current.resetAfterIndex(index);
	}, []);
	const getSize = index => sizeMap.current[index] || 50;
	const [hasVerticalScrollbar, setHasVerticalScrollbar] = useState(false);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			const element = listRef.current;

			if (element) {
				let outerRef = (element as { _outerRef?: any })?._outerRef;
				const innerDiv = outerRef.firstElementChild;
				const tableHeightString = window.getComputedStyle(innerDiv).height;
				let containerHeight = props.height ? props.height : 0;

				if (typeof containerHeight === "string") {
					containerHeight = parseInt(containerHeight, 10);
				}
				let tableHeightInt = parseInt(tableHeightString, 10);
				setHasVerticalScrollbar(tableHeightInt > containerHeight);
				if (props.currentShowSurroundingIndex) {
					(element as any).scrollToItem(props.currentShowSurroundingIndex - 2, "start");
				}
			}
		}, 50);

		return () => clearTimeout(timeoutId);
	}, []);

	return (
		<List
			ref={listRef}
			height={props.height || "100%"}
			width={props.width || "100%"}
			itemCount={props.itemCount}
			itemSize={getSize}
			itemData={props.itemData}
			style={{ borderRight: hasVerticalScrollbar ? "1px solid var(--base-border-color)" : "none" }}
		>
			{({ data, index, style }) => (
				<div style={style}>
					<Row data={data} index={index} setSize={setSize} windowWidth={props.width || "100%"} />
				</div>
			)}
		</List>
	);
};

const Row = ({ data, index, setSize, windowWidth }) => {
	const rowRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		//@ts-ignore
		setSize(index, rowRef.current.getBoundingClientRect().height);
	}, [setSize, index, windowWidth]);

	const StyledRow = styled.div`
		box-sizing: border-box;
		border-left: 1px solid var(--base-border-color);
		border-right: 1px solid var(--base-border-color);
		border-bottom: 1px solid var(--base-border-color);
		word-wrap: break-word;
		white-space: normal;
	`;

	return <StyledRow ref={rowRef}>{data[index]}</StyledRow>;
};
