import React from "react";
import { LegendProps } from "recharts";
import styled from "styled-components";

interface EventTypeLegendProps extends LegendProps {
	eventType?: string;
}
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

const ListItem = styled.li`
	color: ${props => props.color || "inherit"};
	list-style-type: none; /* Remove default bullet point style */
	margin: 0;
	padding: 0;
`;

export const EventTypeLegend: React.FC<EventTypeLegendProps> = ({ payload, eventType }) => {
	if (eventType && payload) {
		return (
			<ul>
				{payload.map((entry, index) => (
					<ListItem key={`item-${index}`} style={{ color: entry.color }}>
						<Bullet bulletColor={entry.color} />
						{eventType}s
					</ListItem>
				))}
			</ul>
		);
	}

	return null;
};
