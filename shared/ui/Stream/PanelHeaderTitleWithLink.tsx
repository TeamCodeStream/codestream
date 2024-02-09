import React from "react";
import styled from "styled-components";
import Icon from "./Icon";

interface HeaderTitleProps {
	href: string;
	text: string;
	title: string;
}

export const PanelHeaderTitleWithLink: React.FC<HeaderTitleProps> = ({ title, href, text }) => {
	const Container = styled.div`
		display: flex;
		justify-content: space-between;
	`;

	const IconContainer = styled.div`
		margin-top: 3px;
		margin-right: 6px;
	`;

	const LinkContainer = styled.div`
		margin-top: 4px;
	`;

	const StyledLink = styled.a`
		text-decoration: none !important;
	`;

	const RightContainer = styled.div`
		display: flex;
		font-size: 12px;
	`;

	return (
		<Container>
			<span>{title}</span>
			<RightContainer>
				<IconContainer>
					<Icon name="light-bulb" />
				</IconContainer>
				<LinkContainer>
					<StyledLink href={href}>{text}</StyledLink>
				</LinkContainer>
			</RightContainer>
		</Container>
	);
};
