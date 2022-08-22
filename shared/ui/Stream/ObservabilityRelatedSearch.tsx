import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState, useEffect } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Select from "react-select";
import ReactDOM from "react-dom";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "..";
import { any } from "prop-types";
import { GetServiceLevelTelemetryRequestType } from "@codestream/protocols/agent";
import styled from "styled-components";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";

interface Props {
	searchItems: any;
	currentRepoId: string;
}

export const ObservabilityRelatedSearch = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(false);
	const [goldenMetrics, setGoldenMetrics] = useState<any | undefined>(undefined);
	const [selectedOption, setSelectedOption] = useState<any>();
	const [selectOptions, setSelectOptions] = useState<any>([{ value: "", label: "" }]);
	const { searchItems } = props;

	const SelectContainer = styled.div`
		padding: 2px 10px 2px 50px;
		width: 100%;
		.react-select__single-value {
			background: none !important;
		}
	`;

	// Note: searchItems[0] example structure for reference, delete later
	//
	// accountName: "NewRelic Administration"
	// alertSeverity: null
	// domain: "VIZ"
	// guid: "MXxWSVp8REFTSEJPQVJEfDEyNzM1MA"
	// name: " Tischler Researching 05/01 Incident"
	// type: "CALLS"

	useEffect(() => {
		if (expanded) {
			const _selectOptions = searchItems.map(item => {
				return {
					value: item?.guid,
					label: item?.name
				};
			});
			setSelectOptions(_selectOptions);
		}
	}, [searchItems, expanded]);

	useEffect(() => {
		if (!_isEmpty(selectedOption)) {
			setLoadingGoldenMetrics(true);
			fetchGoldenMetrics(selectedOption.value);
		}
	}, [selectedOption]);

	const fetchGoldenMetrics = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.instance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: props.currentRepoId,
				skipRepoFetch: true
			});
			if (response?.goldenMetrics) {
				setGoldenMetrics(response.goldenMetrics);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	const handleChange = option => {
		console.warn(option);
		setSelectedOption(option);
	};

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 50px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>
					Search for {searchItems.length} additional services
				</span>
			</Row>
			{expanded && !_isEmpty(searchItems) && (
				<>
					<SelectContainer>
						<Select
							id="input-related-services"
							name="relatedservices"
							classNamePrefix="react-select"
							value={selectedOption}
							placeholder="Related Service"
							options={selectOptions}
							onChange={handleChange}
							isClearable={true}
						/>
					</SelectContainer>
					{!_isEmpty(goldenMetrics) && (
						<>
							<ObservabilityGoldenMetricDropdown
								goldenMetrics={goldenMetrics}
								loadingGoldenMetrics={loadingGoldenMetrics}
								noDropdown={true}
							/>
						</>
					)}
				</>
			)}
		</>
	);
});
