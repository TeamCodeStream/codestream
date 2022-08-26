import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState, useEffect } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Select from "react-select";
import { useInterval } from "../utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { GetServiceLevelTelemetryRequestType } from "@codestream/protocols/agent";
import styled from "styled-components";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import { GoldenMetricsResult, RelatedEntitiesByType } from "@codestream/protocols/agent";
interface Props {
	searchItems: RelatedEntitiesByType;
	currentRepoId: string;
}
interface SelectedOption {
	value: string;
	label: string;
}

export const ObservabilityRelatedSearch = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(false);
	const [goldenMetrics, setGoldenMetrics] = useState<GoldenMetricsResult[]>([]);
	const [selectedOption, setSelectedOption] = useState<SelectedOption | undefined>(undefined);
	const [selectOptions, setSelectOptions] = useState<SelectedOption[]>([]);
	const { searchItems } = props;

	const SelectContainer = styled.div`
		padding: 2px 10px 2px 50px;
		width: 100%;
		.react-select__single-value {
			background: none !important;
		}
	`;

	//https://stackoverflow.com/a/60912805/1704858
	const customStyles = {
		control: (provided, state) => ({
			...provided,
			background: "#fff",
			borderColor: "#9e9e9e",
			minHeight: "25px",
			height: "25px",
			boxShadow: state.isFocused ? null : null
		}),

		valueContainer: (provided, state) => ({
			...provided,
			height: "25px",
			padding: "0 6px"
		}),

		input: (provided, state) => ({
			...provided,
			margin: "0px"
		}),
		indicatorSeparator: state => ({
			display: "none"
		}),
		indicatorsContainer: (provided, state) => ({
			...provided,
			height: "25px"
		}),
		clearIndicator: (provided, state) => ({
			...provided,
			marginTop: "3px",
			padding: "8px 0px 8px 8px"
		}),
		dropdownIndicator: (provided, state) => ({
			...provided,
			marginTop: "3px"
		})
	};

	useEffect(() => {
		if (expanded) {
			const _selectOptions = searchItems.map(item => {
				return {
					value: item?.guid,
					label: item?.name
				};
			});
			if (_selectOptions) {
				setSelectOptions(_selectOptions);
			}
		}
	}, [searchItems, expanded]);

	useEffect(() => {
		if (!_isEmpty(selectedOption)) {
			setLoadingGoldenMetrics(true);
			fetchGoldenMetrics(selectedOption?.value);
		}
	}, [selectedOption]);

	useInterval(() => {
		if (!_isEmpty(selectedOption)) {
			fetchGoldenMetrics(selectedOption?.value);
		}
	}, 300000);

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
		setSelectedOption(option);
		if (!option) {
			setGoldenMetrics([]);
		}
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
							styles={customStyles}
						/>
					</SelectContainer>
					{loadingGoldenMetrics && <div style={{ marginTop: "2px" }}> </div>}
					<ObservabilityGoldenMetricDropdown
						goldenMetrics={goldenMetrics}
						loadingGoldenMetrics={loadingGoldenMetrics}
						noDropdown={true}
					/>
				</>
			)}
		</>
	);
});
