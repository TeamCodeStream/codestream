import React from "react";
import styled from "styled-components";

type FacetTooltipProps = {
	active?: boolean;
	payload?: Array<any>;
	label?: any;
	facet: string[];
};

const StyledFacetTooltipWrapper = styled.div`
	.tooltip--custom {
		background: var(--base-background-color);
		border: 1px solid var(--base-border-color);
		color: var(--text-color);
		padding: 5px;
		font-size: 10px;
	}
`;

export const FacetTooltip = ({ active, payload, label, facet }: FacetTooltipProps) => {
	if (active && payload && payload.length) {
		let facetName;
		if (facet.length === 1) {
			facetName = payload[0].payload[facet[0]];
		} else {
			facetName = payload[0].payload["facet"].join(", ");
		}

		return (
			<StyledFacetTooltipWrapper>
				<div className="tooltip--custom">
					<p>{facetName}</p>
					<p>Value: {payload[0].value}</p>
				</div>
			</StyledFacetTooltipWrapper>
		);
	}

	return null;
};
