import React from "react";
import styled from "styled-components";
import { LegendProps } from "recharts";

interface EventTypeTooltipProps {
	active?: boolean;
	payload?: any[];
	label?: string;
	timeRangeDisplay?: boolean;
	eventType: string;
}

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
	timeRangeDisplay,
}) => {
	const formatXAxisTime = time => new Date(time).toLocaleTimeString();

	const computedStyle = getComputedStyle(document.body);
	const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
	const colorBackgroundHover = computedStyle
		.getPropertyValue("--app-background-color-hover")
		.trim();

	if (active && payload && payload.length && label) {
		const {
			value: dataValue,
			payload: { beginTimeSeconds, endTimeSeconds },
			color: bulletColor = "black",
		} = payload[0];
		const formattedStart = formatXAxisTime(beginTimeSeconds);
		const formattedTime = formatXAxisTime(endTimeSeconds);

		if (!timeRangeDisplay) {
			return (
				<Container colorSubtle={colorSubtle} colorBackgroundHover={colorBackgroundHover}>
					<div>{formattedTime}</div>
					<EventTypeValueContainer>
						<EventType>
							<Bullet bulletColor={bulletColor} />
							{eventType}s
						</EventType>
						<Value>{dataValue}</Value>
					</EventTypeValueContainer>
				</Container>
			);
		}

		if (timeRangeDisplay) {
			return (
				<Container colorSubtle={colorSubtle} colorBackgroundHover={colorBackgroundHover}>
					<div>{eventType}s</div>
					<div>
						{dataValue} from {formattedStart} to {formattedTime}
					</div>
				</Container>
			);
		}
	}
	return null;
};
