import { PropsWithChildren } from "react";
import React from "react";
import styled, { CSSProperties } from "styled-components";
import Icon from "../../Stream/Icon";

export interface IRadioGroupContext {
	name: string;
	selectedValue: string;
	loading?: boolean;
	disabled?: boolean;
	onChange: Function;
}

export const RadioGroupContext = React.createContext<IRadioGroupContext>({
	name: "",
	selectedValue: "",
	loading: false,
	disabled: false,
	onChange: () => {}
});

interface RadioProps {
	value: string;
	children: React.ReactNode;
	disabled?: boolean;
	className?: string;
	"data-testid"?: string;
}

const RadioDiv = styled.div`
	display: flex;
	margin-bottom: 5px;
	> div {
		margin-right: 5px;
		text-align: center;
		flex: 1 1 20px;
	}
	label {
		flex: 100 1;
	}
	&.disabled {
		opacity: 0.5;
	}
	&:not(.disabled) {
		input,
		label {
			cursor: pointer;
		}
		label:hover {
			color: var(--text-color-highlight);
		}
	}
	.icon.spin {
		display: inline-block;
		margin: 0 5px 0 2px;
		vertical-align: 2px;
	}
	&:not(.disabled) input[type="radio"] {
		cursor: pointer;
	}
	input[type="radio"] {
		-webkit-appearance: none;
		background: rgba(127, 127, 127, 0.4);

		// padding: 8px;
		width: 16px;
		height: 16px;
		display: inline-block;
		position: relative;
		border-radius: 10px;
		margin: 0 5px 0 0;
		&:checked {
			background: var(--text-color-info-muted);
		}
		&:checked:after {
			content: "";
			position: absolute;
			top: 6px;
			left: 6px;
			width: 4px;
			height: 4px;
			border-radius: 2px;
			background: white;
		}
	}
`;

export function Radio(props: PropsWithChildren<RadioProps>) {
	const { name, selectedValue, onChange, loading, disabled } = React.useContext(RadioGroupContext);

	const isDisabled = disabled || props.disabled;
	const className = (props.className || "") + (isDisabled ? " disabled" : "");
	const showSpinner = loading && props.value === selectedValue;
	return (
		<RadioDiv className={className}>
			<div>
				{showSpinner ? (
					<Icon className="spin" name="sync" data-testid={props["data-testid"] + "-loading"} />
				) : (
					<input
						type="radio"
						data-testid={props["data-testid"]}
						className={disabled ? "disabled" : ""}
						name={name}
						value={props.value}
						disabled={isDisabled}
						id={name + ":" + props.value}
						checked={props.value === selectedValue}
						onChange={e => onChange(props.value)}
					/>
				)}
			</div>
			<label htmlFor={name + ":" + props.value}>{props.children}</label>
		</RadioDiv>
	);
}

// you can disable the entire radio group, or an individual Radio item
interface RadioGroupProps {
	name: string;
	selectedValue: string;
	loading?: boolean;
	children: React.ReactNode;
	onChange: Function;
	disabled?: boolean;
	className?: string;
}

const Root = styled.div``;

export function RadioGroup(props: PropsWithChildren<RadioGroupProps>) {
	const context = React.useContext(RadioGroupContext);
	context.name = props.name;
	context.selectedValue = props.selectedValue;
	context.onChange = props.onChange;
	context.loading = props.loading;
	context.disabled = props.disabled || false;
	const className = `control-group radio ${props.className || ""}`;
	return <Root className={className}>{props.children}</Root>;
}
