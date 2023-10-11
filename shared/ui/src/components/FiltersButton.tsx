import React from "react";
import styled from "styled-components";
import Menu from "../../Stream/Menu";
import { Button } from "./Button";

const StyledButton = styled(Button)`
	flex-grow: 0;
	white-space: nowrap;
	.icon {
		padding-left: 5px;
		display: inline-block;
		transform: scale(0.8);
	}
`;

interface State {
	open: boolean;
	target?: any;
}

export interface Props {
	items: any[];
	title?: string;
	children?: React.ReactNode;
}

export default class FiltersButton extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { open: false, target: undefined };
	}

	openMenu = (e: React.SyntheticEvent) => {
		// @ts-ignore
		this.setState({ open: !this.state.open, target: e && e.target.closest("button") });
	};

	noop = value => {
		if (!value) this.setState({ open: false });
	};

	render() {
		const { items, title, children } = this.props;
		return (
			<>
				<StyledButton onClick={this.openMenu}>{children}</StyledButton>
				{this.state.open && (
					<Menu
						title={title}
						align="dropdownLeft"
						items={items}
						target={this.state.target}
						action={this.openMenu}
					/>
				)}
			</>
		);
	}
}
