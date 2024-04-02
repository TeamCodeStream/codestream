import React, { useRef, useState, useCallback } from "react";
import { Button } from "../../src/components/Button";
import Tooltip from "../Tooltip";
import { SelectedOption } from "./APMLogSearchPanel";
import { useDidMount } from "../../utilities/hooks";
import { SelectCustomStyles } from "../AsyncPaginateCustomStyles";

const menuPortalTarget = document.body;

export const APMPartitions = (props: {
	selectedPartitions: SelectedOption[];
	selectPartitionOptions: SelectedOption[];
	partitionsCallback: Function;
}) => {
	const { selectedPartitions, selectPartitionOptions: initialOptions, partitionsCallback } = props;

	const selectRef = useRef(null);

	const [open, setOpen] = useState<boolean>(false);
	const [temporarySelectedPartitions, setTemporarySelectedPartitions] =
		useState<SelectedOption[]>(selectedPartitions);
	const [options, setOptions] = useState<SelectedOption[]>(initialOptions);

	useDidMount(() => {
		setOptions(initialOptions);
	});

	const customStyles = {
		multiValueRemove: () => ({
			display: "none",
		}),
		multiValueLabel: () => ({
			display: "none",
			textOverflow: "ellipsis",
			textWrap: "nowrap",
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
			textOverflow: "ellipsis",
			textWrap: "nowrap",
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
		const isChecked = temporarySelectedPartitions.some(_ => _.value === data.value);
		const isDisabled =
			temporarySelectedPartitions.find(_ => _.value === data.value)?.disabled || false;

		const isFirst = options[0].value === data.value;
		const isLast = options[options.length - 1].value === data.value;

		const optionMargin = isFirst
			? "12px 12px 4px 12px"
			: isLast
			? "4px 12px 12px 12px"
			: "4px 12px";

		if (isDisabled) {
			return (
				<Tooltip title={"Must have one partition selected"} delay={1}>
					<div style={{ margin: optionMargin }} {...innerProps}>
						<input
							style={{ opacity: ".5" }}
							type="checkbox"
							checked={isChecked}
							onChange={() => null}
						/>
						<span style={{ cursor: "pointer" }}>{data.label}</span>
					</div>
				</Tooltip>
			);
		} else {
			return (
				<div style={{ margin: optionMargin }} {...innerProps}>
					<input type="checkbox" checked={isChecked} onChange={() => null} />
					<span style={{ cursor: "pointer" }}>{data.label}</span>
				</div>
			);
		}
	};

	const CustomMultiValueLabel = ({ ...props }) => {
		if (
			temporarySelectedPartitions &&
			temporarySelectedPartitions.length > 0 &&
			temporarySelectedPartitions[0].value === props.data.value
		) {
			return <div>Partitions ({temporarySelectedPartitions.length}) </div>;
		} else {
			return <div style={{ display: "none" }}>&nbsp;</div>;
		}
	};

	// Needs callback to prevent re-renders.  Better optimization and fixes
	// a scroll to top on select bug
	const CustomMenuList = useCallback(
		(props: any) => {
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
					<div style={{ flex: "1", borderRight: "1px solid var(--base-border-color)" }}>
						{props.children}
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							position: "sticky",
							bottom: "0",
							padding: "10px",
							borderTop: "1px solid var(--base-border-color)",
							borderRight: "1px solid var(--base-border-color)",
							background: "var(--base-background-color)",
						}}
					>
						<Button onClick={handleDoneClick}>Done</Button>
					</div>
				</div>
			);
		},
		[temporarySelectedPartitions, options]
	);

	const handleDoneClick = () => {
		partitionsCallback(temporarySelectedPartitions);
		setOpen(false);
	};

	const handleBlur = () => {
		partitionsCallback(temporarySelectedPartitions);
	};

	const handleChange = values => {
		if (values.length > 0) {
			if (values.length === 1) {
				values[0].disabled = true;
			} else {
				values.forEach(obj => {
					if (obj.disabled === true) {
						obj.disabled = false;
					}
				});
			}
			setTemporarySelectedPartitions(values);
		}
	};

	return (
		<div style={{ minWidth: "130px" }} className="log-filter-bar-partition">
			<SelectCustomStyles
				menuIsOpen={open}
				onMenuOpen={() => setOpen(true)}
				onMenuClose={() => setOpen(false)}
				menuPortalTarget={menuPortalTarget}
				ref={selectRef}
				id="input-partition"
				name="partition"
				classNamePrefix="react-select"
				options={options}
				captureMenuScroll={false}
				isMulti
				isClearable={false}
				closeMenuOnSelect={false}
				hideSelectedOptions={false}
				value={temporarySelectedPartitions}
				onChange={values => handleChange(values)}
				styles={customStyles}
				menuShouldScrollIntoView={false}
				isSearchable={false}
				onBlur={handleBlur}
				components={{
					MenuList: CustomMenuList,
					Option: CustomOption,
					MultiValueLabel: CustomMultiValueLabel,
				}}
			/>
		</div>
	);
};
