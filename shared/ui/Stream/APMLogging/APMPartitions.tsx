import React from "react";
import Select from "react-select";
import { Button } from "../../src/components/Button";

export const APMPartitions = (props: {
	selectedPartitions: any;
	selectPartitionOptions: any;
	partitionsCallback: Function;
}) => {
	const { selectedPartitions, selectPartitionOptions, partitionsCallback } = props;

	interface Option {
		value: string;
		label: string;
	}
	const customStyles = {
		multiValueRemove: () => ({
			display: "none",
		}),
		multiValueLabel: (provided, state) => ({
			display: "none",
		}),
		valueContainer: (defaultStyles: any) => {
			return {
				...defaultStyles,
				padding: "0",
				margin: "0 !important",
			};
		},
		clearIndicator: () => ({
			display: "none",
		}),
		menu: provided => ({
			...provided,
			backgroundColor: "var(--base-background-color) !important",
			maxHeight: "500px",
			minWidth: "300px",
			overflowY: "auto",
			left: "auto",
			right: 0,
		}),
	};

	const CustomOption = ({ innerProps, data }) => {
		const isChecked = selectedPartitions.some(obj => obj.value === data.value);

		const isFirst = selectPartitionOptions[0].value === data.value;
		const isLast = selectPartitionOptions[selectPartitionOptions.length - 1].value === data.value;

		const optionMargin = isFirst
			? "12px 12px 4px 12px"
			: isLast
			? "4px 12px 12px 12px"
			: "4px 12px";

		return (
			<div style={{ margin: optionMargin }} {...innerProps}>
				<input type="checkbox" checked={isChecked} onChange={() => null} />
				<span style={{ cursor: "pointer" }}>{data.label}</span>
			</div>
		);
	};

	const CustomMenuList = ({ children }) => {
		return (
			<div>
				{children}
				<Button onClick={() => console.log("Done!")}>Done</Button>
			</div>
		);
	};

	const CustomMultiValueLabel = ({ ...props }) => {
		if (
			selectedPartitions &&
			selectedPartitions.length > 0 &&
			selectedPartitions[0].value === props.data.value
		) {
			return <div>Partitions ({selectedPartitions.length}) </div>;
		} else {
			return <div style={{ display: "none" }}>&nbsp;</div>;
		}
	};

	return (
		<div className="log-filter-bar-partition">
			<Select
				id="input-partition"
				name="partition"
				classNamePrefix="react-select"
				options={selectPartitionOptions}
				captureMenuScroll={false}
				isMulti
				isClearable={false}
				closeMenuOnSelect={false}
				hideSelectedOptions={false}
				value={selectedPartitions}
				onChange={values => partitionsCallback(values || [])}
				styles={customStyles}
				components={{
					MenuList: CustomMenuList,
					Option: CustomOption,
					MultiValueLabel: CustomMultiValueLabel,
				}}
			/>
		</div>
	);
};
