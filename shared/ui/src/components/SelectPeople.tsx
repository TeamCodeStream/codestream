import React from "react";
import styled from "styled-components";
import Menu from "../../Stream/Menu";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { HeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { CSUser, CSMe } from "@codestream/protocols/api";
import { CodeStreamState } from "@codestream/webview/store";
import { getTeamMembers } from "@codestream/webview/store/users/reducer";
import { connect } from "react-redux";
import Icon from "@codestream/webview/Stream/Icon";

const ClickTarget = styled.span`
	cursor: pointer;
	.octicon-chevron-down,
	.octicon-chevron-down-thin {
		display: inline-block;
		transform: scale(0.8);
		margin-left: 2px;
	}
	&:hover {
		color: var(--text-color-highlight);
	}
`;

export interface HeadshotMenuProps {
	size?: number;
	className?: string;
}

interface State {
	open: boolean;
	target?: any;
}

export interface Props extends ConnectedProps {
	title?: string;
	// value is either an array of email addresses, or CSUser objects
	value: (string | CSUser)[];
	onChange: Function;
	children?: React.ReactNode;
	multiSelect?: boolean;
	labelExtras?: { [id: string]: string };
	extraItems?: any[];
}

interface ConnectedProps {
	teamMembers: CSUser[];
}

class SelectPeople extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { open: false, target: undefined };
	}

	openMenu = (e: React.SyntheticEvent) => {
		this.setState({ open: !this.state.open, target: e && e.target });
	};

	render() {
		const { value, title, children, teamMembers, onChange } = this.props;
		const items = teamMembers.filter(_ => !_.email.match(/noreply/)).map(person => {
			const selected = value.find(v => {
				if (typeof v === "string") return v === person.email;
				else return v.id === person.id;
			})
				? true
				: false;
			const { fullName = "", username = "", email = "" } = person;
			return {
				label: fullName ? username : email,
				subtle: fullName || username,
				searchLabel: [fullName, username, email].join(":"),
				checked: this.props.multiSelect ? selected : undefined,
				value: person.username,
				key: person.id,
				icon: (
					<span style={{ paddingLeft: "5px" }}>
						<Headshot size={20} display="inline-block" person={person} />
					</span>
				),
				action: () => onChange(person)
			};
		}) as any;
		if (items.length >= 5) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}
		if (this.props.extraItems) items.push(...this.props.extraItems);
		return (
			<>
				<ClickTarget onClick={this.openMenu}>{children}</ClickTarget>
				{this.state.open && (
					<Menu
						title={title}
						align="center"
						valign="bottom"
						items={items}
						target={this.state.target}
						action={this.openMenu}
						dontCloseOnSelect={this.props.multiSelect}
						repositionMinimally
					/>
				)}
			</>
		);
	}
}

const mapStateToProps = (state: CodeStreamState): ConnectedProps => {
	return { teamMembers: getTeamMembers(state) };
};

const ConnectedSelectPeople = connect(mapStateToProps, {})(SelectPeople);

export { ConnectedSelectPeople as SelectPeople };
