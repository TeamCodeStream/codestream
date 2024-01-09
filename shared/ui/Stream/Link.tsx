import React, { PropsWithChildren } from "react";
// import { CodeStreamState } from "@codestream/webview/store";
import Tooltip from "@codestream/webview/Stream/Tooltip";
// import { useAppSelector } from "@codestream/webview/utilities/hooks";

import { OpenUrlRequestType } from "../ipc/host.protocol";
import { HostApi } from "../webview-api";

interface Props {
	href?: string;
	onClick?(event: React.SyntheticEvent): void;
	className?: string;
	useStopPropagation?: boolean;
	disabled?: boolean;
	disabledHover?: string;
	"data-testid"?: string;
}

export const Link = React.memo((props: PropsWithChildren<Props>) => {
	/*


	Hey code reviewer... is this ok to delete? 
	(state.capabilities.openLink) doesnt seem to be a thing..


	*/
	// const derivedState = useAppSelector((state: CodeStreamState) => {
	// 	return { useHref: props.href && state.capabilities.openLink };
	// });

	const onClick =
		props.onClick ||
		function (event: React.MouseEvent) {
			const target = event.target as HTMLAnchorElement;
			if (!target.href) {
				event.preventDefault();
				if (props.useStopPropagation) {
					event.stopPropagation();
				}
				if (props.href) {
					HostApi.instance.send(OpenUrlRequestType, { url: props.href });
				}
			}
		};

	return (
		<React.Fragment key={String(props.disabled)}>
			{props.disabled === true ? (
				<Tooltip content={props.disabledHover} placement={"bottom"}>
					<span className={props.className} style={{ textDecoration: "underline" }}>
						{props.children}
					</span>
				</Tooltip>
			) : (
				<a
					data-testid={props["data-testid"]}
					href={props.href}
					onClickCapture={onClick}
					className={props.className}
				>
					{props.children}
				</a>
			)}
		</React.Fragment>
	);
});
