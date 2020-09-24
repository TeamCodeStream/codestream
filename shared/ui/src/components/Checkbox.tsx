import { PropsWithChildren } from "react";
import React from "react";
import styled from "styled-components";
import Icon from "../../Stream/Icon";
import cx from "classnames";

interface Props {
	name: string;
	className?: string;
	checked?: boolean;
	disabled?: string;
	loading?: boolean;
	noMargin?: boolean;
	onClickLabel?: React.MouseEventHandler;
	onChange: (value: boolean) => void;
}

const Root = styled.div<{ noMargin?: boolean }>`
	display: flex;
	width: auto;
	margin-bottom: ${props => (props.noMargin ? "0" : "5px")};
	align-items: center;
	&.disabled {
		opacity: 0.5;
		pointer-events: none;
	}
	> div {
		text-align: center;
		flex: 1 1 20px;
	}
	> span {
		display: inline-block;
		flex: 100 1;
	}
	label {
		padding-top: 1px !important;
		padding-bottom: 0 !important;
	}
	input,
	label {
		cursor: pointer;
		margin-top: 0 !important; // this is an override of styles imposed by .standard-form
		margin-bottom: 0 !important; // this is an override of styles imposed by .standard-form
	}
	label:hover {
		color: var(--text-color-highlight);
	}
`;

export function Checkbox(props: PropsWithChildren<Props>) {
	const { name, checked, onChange, onClickLabel, loading, className, noMargin } = props;

	const id = `checkbox-${name}`;
	const htmlFor = onClickLabel ? "" : id;
	console.warn("DISABLED IS: ", props.disabled);
	return (
		<Root className={cx(className, { disabled: props.disabled })} noMargin={noMargin}>
			<div>
				{loading ? (
					<Icon className="spin" name="sync" />
				) : (
					<input
						id={id}
						type="checkbox"
						name={name}
						checked={checked}
						onChange={e => onChange(!checked)}
					/>
				)}
			</div>
			<span>
				<label htmlFor={htmlFor} onClick={onClickLabel}>
					{props.children}
				</label>
			</span>
			{props.disabled && <span className="subtle">{props.disabled}</span>}
		</Root>
	);
}
