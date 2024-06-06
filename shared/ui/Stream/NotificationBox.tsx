import { WarningOrError } from "@codestream/protocols/agent";
import React from "react";
import styled from "styled-components";

import Icon from "./Icon";
import { Link } from "./Link";

interface NotificationBoxRootProps {
	customMargin?: string;
}

export const NotificationBoxRoot = styled.div<NotificationBoxRootProps>`
	margin: ${props => props.customMargin || "10px 10px 20px 0"};
	border: 1px solid rgb(0, 206, 124, 0.4);
	background: rgb(0, 206, 124, 0.05);
	border-radius: 5px;
	padding: 10px;
	display: flex;
	align-items: center;
	.icon.alert {
		display: inline-block;
		transform: scale(1.5);
		margin: 0 10px;
	}
	.message {
		margin-left: 10px;
	}
	.icon.dismiss {
		display: inline-block;
		margin-top: -35px;
	}
	.icon.dismiss:hover {
		cursor: pointer;
	}
`;

interface Props {
	items: WarningOrError[];
	dismissCallback?: (event: React.SyntheticEvent<Element, Event>) => any;
	style?: any;
}

export const NotificationBox = (props: Props) => {
	return (
		<NotificationBoxRoot style={props.style}>
			<Icon name="info" className="alert" />
			<div className="message">
				{props.items.map(_ => {
					const split = _.message.split("\n");

					return split.map((item, index) => {
						const templateRe = /(.*)\[(.+)\](.*)/g;
						const match = templateRe.exec(item);
						if (match != null) {
							const [, pre, linkText, post] = match;
							return (
								<div key={"warningOrError_" + index}>
									{pre}
									<Link href={_.helpUrl!}>{linkText}</Link>
									{post}
								</div>
							);
						} else {
							return (
								<div key={"warningOrError_" + index}>
									{item}
									{_.helpUrl && split.length - 1 === index && (
										<>
											{" "}
											<Link href={_.helpUrl!}>Learn more</Link>
										</>
									)}
									<br />
								</div>
							);
						}
					});
				})}
			</div>
			{props.dismissCallback && (
				<Icon name="x" className="dismiss" onClick={props.dismissCallback} />
			)}
		</NotificationBoxRoot>
	);
};
