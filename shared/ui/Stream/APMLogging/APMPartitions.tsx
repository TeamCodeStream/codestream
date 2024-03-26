import React, { useRef, useState } from "react";
import Select from "react-select";
import { Button } from "../../src/components/Button";

const menuPortalTarget = document.body;

export const APMPartitions = (props: {
	selectedPartitions: any;
	selectPartitionOptions: any;
	partitionsCallback: Function;
}) => {
	const { selectedPartitions, selectPartitionOptions, partitionsCallback } = props;
	const selectRef = useRef(null);
	const [open, setOpen] = useState<boolean>(false);
	const customStyles = {
		multiValueRemove: () => ({
			display: "none",
		}),
		multiValueLabel: () => ({
			display: "none",
		}),
		multiValue: () => ({
			margin: 0,
		}),
		clearIndicator: () => ({
			display: "none",
		}),
		menu: provided => ({
			...provided,
			backgroundColor: "var(--base-background-color) !important",
			minWidth: "300px",
			overflowY: "auto",
			left: "auto",
			right: 0,
		}),
		valueContainer: (defaultStyles: any) => {
			return {
				...defaultStyles,
				padding: "0",
				margin: "0 !important",
			};
		},
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
				menuIsOpen={open}
				onMenuOpen={() => setOpen(true)}
				onMenuClose={() => setOpen(false)}
				menuPortalTarget={menuPortalTarget}
				ref={selectRef}
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
					MenuList: <CustomMenuList {...props} setOpenCallback={setOpen} />,
					Option: CustomOption,
					MultiValueLabel: CustomMultiValueLabel,
				}}
			/>
		</div>
	);
};

const CustomMenuList = props => {
	const { children, setOpenCallback } = props;
	return (
		<div
			style={{
				position: "relative",
				maxHeight: "500px",
				overflowY: "auto",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div style={{ flex: "1", borderRight: "1px solid var(--base-border-color)" }}>{children}</div>
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					position: "sticky",
					bottom: "0",
					padding: "10px",
					borderTop: "1px solid var(--base-border-color)",
					background: "var(--base-background-color)",
				}}
			>
				<Button onClick={() => setOpenCallback(false)}>Done</Button>
			</div>
		</div>
	);
};
