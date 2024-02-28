import React from "react";
import styled from "styled-components";
import { LegendProps } from "recharts";

interface FacetLineTooltipProps {
	active?: boolean;
	payload?: { payload: any; dataKey: string; color: string; value: number }[];
	label?: string;
	timeRangeDisplay?: boolean;
	activeDotKey?: string;
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

const FacetLineValueContainer = styled.div`
	margin-top: 3px;
	display: flex;
	justify-content: space-between;
`;

const FacetLine = styled.span`
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

export const FacetLineTooltip: React.FC<FacetLineTooltipProps> = ({
	active,
	payload,
	label,
	activeDotKey,
	timeRangeDisplay,
}) => {
	const formatXAxisTime = time => {
		const date = new Date(time * 1000);
		return `${date.toLocaleTimeString()}`;
	};

	const computedStyle = getComputedStyle(document.body);
	const colorSubtle = computedStyle.getPropertyValue("--text-color-subtle").trim();
	const colorBackgroundHover = computedStyle
		.getPropertyValue("--app-background-color-hover")
		.trim();

	if (active && payload && payload.length && label && activeDotKey) {
		const activeDotPayload = payload.find(obj => obj.dataKey === activeDotKey);
		if (activeDotPayload) {
			const activeTime = formatXAxisTime(activeDotPayload.payload.endTimeSeconds);
			const activeRoundedValue = Number(activeDotPayload.value.toFixed(2));

			if (!timeRangeDisplay) {
				return (
					<Container colorSubtle={colorSubtle} colorBackgroundHover={colorBackgroundHover}>
						<div>{activeTime}</div>
						<FacetLineValueContainer>
							<FacetLine>
								<Bullet bulletColor={activeDotPayload.color} />
								{activeDotPayload.dataKey}
							</FacetLine>
							<Value>{activeRoundedValue}</Value>
						</FacetLineValueContainer>
					</Container>
				);
			}
		}
	}
	return null;
};
