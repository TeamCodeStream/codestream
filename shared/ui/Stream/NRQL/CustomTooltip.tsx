import React from "react";
import styled from "styled-components";

type CustomTooltipProps = {
	active?: boolean;
	payload?: Array<any>;
	label?: any;
	facet: string[];
};

const StyledCustomTooltipWrapper = styled.div`
	.tooltip--custom {
		background: var(--base-background-color);
		border: 1px solid var(--base-border-color);
		color: var(--text-color);
		padding: 5px;
		font-size: 10px;
	}
`;

export const CustomTooltip = ({ active, payload, label, facet }: CustomTooltipProps) => {
	if (active && payload && payload.length) {
		let facetName;
		if (facet.length === 1) {
			facetName = payload[0].payload[facet[0]];
		} else {
			facetName = payload[0].payload["facet"].join(", ");
		}

		return (
			<StyledCustomTooltipWrapper>
				<div className="tooltip--custom">
					<p>{facetName}</p>
					<p>Value: {payload[0].value}</p>
				</div>
			</StyledCustomTooltipWrapper>
		);
	}

	return null;
};
