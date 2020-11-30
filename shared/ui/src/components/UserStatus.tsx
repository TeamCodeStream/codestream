import styled from "styled-components";
import React from "react";
import { CSUser } from "@codestream/protocols/api";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import Icon from "@codestream/webview/Stream/Icon";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "../../ipc/host.protocol";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { WebviewPanels } from "@codestream/protocols/webview";
import { openPanel } from "@codestream/webview/Stream/actions";

const Root = styled.span`
	padding-left: 10px;
	display: inline-flex;
	align-items: top;
	.icon {
		margin-right: 5px;
	}
	.icons {
		margin-left: auto;
		visibility: hidden;
		white-space: nowrap;
		.icon {
			margin-right: 0;
			margin-left: 5px;
		}
	}
	&:hover .icons {
		visibility: visible;
	}
`;

const formatTheDate = time => {
	const date = new Date(time);
	return date.toLocaleString();
};

export function UserStatus(props: { user: CSUser; className?: string }) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return { isMe: props.user.id === state.session.userId! };
	});

	const { status } = props.user;
	if (!status || !status.label) return null;

	const handleClick = () => {
		if (status.ticketUrl) {
			HostApi.instance.send(OpenUrlRequestType, { url: status.ticketUrl });
		}
	};

	return (
		<Root className={props.className}>
			{status.ticketProvider ? <Icon name={status.ticketProvider} /> : <Icon name="ticket" />}
			<MarkdownText text={status.label} inline={true}></MarkdownText>
			<div className="icons">
				{status.ticketUrl && <Icon name="globe" className="clickable" onClick={handleClick} />}
				{derivedState.isMe && (
					<Icon
						name="pencil"
						className="clickable"
						onClick={() => dispatch(openPanel(WebviewPanels.Status))}
					/>
				)}
			</div>
		</Root>
	);
}
