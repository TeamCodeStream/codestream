import React from "react";
import { AsyncPaginate } from "react-select-async-paginate";
import Select from "react-select";

const selectStyles = {
	control: (provided, state) => ({
		...provided,
		boxShadow: "none",
		border: `1px solid ${
			state.isFocused ? "var(--text-focus-border-color)" : "var(--base-border-color)"
		} !important`,
		background: "var(--base-background-color) !important",
		margin: 0,
		fontFamily: "inherit",
		fontSize: "13px",
		minHeight: "29px !important",
		borderRadius: 0,
		cursor: "text",
	}),
	input: provided => ({
		...provided,
		fontFamily: "inherit",
		fontSize: "13px",
		color: "var(--text-color) !important",
		input: {
			padding: "0 !important",
			outline: "none !important",
		},
	}),
	singleValue: provided => ({
		...provided,
		color: "var(--text-color) !important",
		fontSize: "13px",
		background: "var(--app-background-color-hover) !important",
		marginTop: "0",
		marginBottom: "0",
		paddingTop: "2px",
	}),
	multiValue: provided => ({
		...provided,
		fontSize: "13px",
		background: "var(--app-background-color-hover)",
		marginTop: "0",
		marginBottom: "0",
	}),
	valueContainer: provided => ({
		...provided,
		padding: "0 5px !important",
		height: "29px !important",
	}),
	multiValueLabel: provided => ({
		...provided,
		color: "var(--text-color)",
	}),
	multiValueRemove: provided => ({
		...provided,
		"&:hover": {
			background: "var(--app-background-color-hover)",
			color: "white",
		},
	}),
	menu: provided => ({
		...provided,
		zIndex: "2",
		border: `1px solid var(--text-focus-border-color)`,
		backgroundColor: "unset",
	}),
	menuList: provided => ({
		...provided,
		background: "var(--base-background-color) !important",
		borderRadius: "3px",
	}),
	option: (provided, state) => ({
		...provided,
		padding: "5px 10px",
		cursor: "pointer",
		"&:hover": {
			background: "var(--text-focus-border-color) !important",
			color: "white",
		},
		background:
			state.isSelected || state.isFocused ? "var(--text-focus-border-color) !important" : "unset",
		color: state.isSelected || state.isFocused ? "white !important" : "inherit",
	}),
	placeholder: provided => ({
		...provided,
		fontSize: "13px !important",
		fontFamily: "inherit !important",
		opacity: "0.5 !important",
		color: "var(--text-color) !important",
	}),
	dropdownIndicator: provided => ({
		...provided,
		color: "var(--text-color) !important",
		opacity: "0.6",
		padding: "0 6px",
	}),
	indicatorSeparator: provided => ({
		...provided,
		backgroundColor: "var(--text-color) !important",
		opacity: "0.25",
		margin: "4px 0",
	}),
};

export const SelectCustomStyles = props => {
	return <Select {...props} styles={selectStyles} />;
};

export const AsyncPaginateCustomStyles = props => {
	return <AsyncPaginate {...props} styles={selectStyles} />;
};
