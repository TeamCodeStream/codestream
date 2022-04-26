import createClassString from "classnames";
import React, { PropsWithChildren } from "react";
import Icon from "./Icon";

interface Props extends PropsWithChildren<{}>, React.ButtonHTMLAttributes<HTMLButtonElement> {
	className?: string;
	disabled?: boolean;
	loading?: boolean;
	isSecondary?: boolean;
}

export default function Button({
	isSecondary = false,
	disabled = false,
	loading = false,
	className = "",
	children,
	...props
}: Props) {
	return (
		<button
			{...props}
			className={createClassString("btn inline-block-tight", className, {
				"btn-primary": !isSecondary,
				"btn-secondary": isSecondary,
				disabled: disabled
			})}
			disabled={loading || disabled}
		>
			{loading ? <Icon name="sync" className="spin" /> : children}
		</button>
	);
}
