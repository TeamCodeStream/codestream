import React from "react";
import styled from "styled-components";
import { LegendProps } from "recharts";

interface EventTypeTooltipProps {
	active?: boolean;
	payload?: any[];
	label?: string;
	eventType: string;
}

const formatXAxisTime = time => {
	return new Date(time).toLocaleTimeString();
};

interface ContainerProps {
	colorSubtle: string;
	colorBackgroundHover: string;
}

const Container = styled.div<ContainerProps>`
	z-index: 9999;
	padding: 5px;
	border: ${props => props.colorSubtle} solid 1px;
	background: ${props => props.colorBackgroundHover};
	border-radius: 4px;
`;

const EventTypeValueContainer = styled.div`
	margin-top: 3px;
	display: flex;
	justify-content: space-between;
`;

const EventType = styled.span`
	margin-right: 20px;
`;

const Value = styled.span``;

interface CustomLegendProps extends LegendProps {
	bulletColor?: string;
}

const Bullet = styled.span<CustomLegendProps>`
	width: 10px;
	height: 10px;
	display: inline-block;
	margin-right: 5px;
	border-radius: 5px;
	background-color: ${props => props.bulletColor || "black"};
`;

export const EventTypeTooltip: React.FC<EventTypeTooltipProps> = ({
	active,
	payload,
	label,
	eventType,
}) => {
	const computedStyle = getComputedStyle(document.body);
	const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
	const colorBackgroundHover = computedStyle
		.getPropertyValue("--app-background-color-hover")
		.trim();

	if (active && payload && payload.length && label) {
		const dataValue = payload[0].value;
		const dataTime = payload[0].payload.endTimeSeconds;
		const formattedTime = formatXAxisTime(dataTime);
		const bulletColor = payload[0]?.color || "black";

		return (
			<Container colorSubtle={colorSubtle} colorBackgroundHover={colorBackgroundHover}>
				<div>{formattedTime}</div>
				<EventTypeValueContainer>
					<EventType>
						<Bullet bulletColor={bulletColor} />
						{eventType}
					</EventType>
					<Value>{dataValue}</Value>
				</EventTypeValueContainer>
			</Container>
		);
	}
	return null;
};
