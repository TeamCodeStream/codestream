import React, { useRef, useCallback, useEffect } from "react";
import { VariableSizeList as List } from "react-window";
import styled from "styled-components";

interface TableWindowProps {
	itemCount: number;
	itemData?: JSX.Element[];
	width?: string | number;
	height?: string | number;
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

	return (
		<List
			ref={listRef}
			height={props.height || "100%"}
			width={props.width || "100%"}
			itemCount={props.itemCount}
			itemSize={getSize}
			itemData={props.itemData}
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
		padding: 1em;
		box-sizing: border-box;
		border-left: 1px solid var(--base-border-color);
		border-right: 1px solid var(--base-border-color);
		border-bottom: 1px solid var(--base-border-color);
		word-wrap: break-word;
		white-space: normal;
	`;

	return <StyledRow ref={rowRef}>{data[index]}</StyledRow>;
};
