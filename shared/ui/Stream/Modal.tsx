import React, { PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import Tooltip from "./Tooltip";
import ScrollBox from "./ScrollBox";
import Icon from "./Icon";
import { useDidMount } from "../utilities/hooks";
import * as contextActions from "../store/context/actions";
import { useDispatch } from "react-redux";

const noopElement = document.createElement("span");

const useModalRoot = () => {
	const element = document.querySelector("#modal-root") || noopElement;

	React.useEffect(() => {
		element.classList.add("active");
		return () => {
			element.classList.remove("active");
		};
	}, []);

	return element as HTMLElement;
};

export const ModalRoot = React.memo(() => {
	return <div id="modal-root" />;
});

const ModalWrapper = styled.div<{ noPadding?: boolean }>`
	width: 100%;
	height: 100%;
	position: absolute;
	z-index: 3000;
	left: 0;
	background-color: var(--app-background-color);
	// background-color: rgba(0, 0, 0, 0.25);
	// backdrop-filter: brightness(50%);
	padding: 0;
	overflow: auto;

	&.translucent {
		// background: rgba(255, 255, 255, 0.8);
		// backdrop-filter: blur(1px);
		// .vscode-dark & {
		background: transparentize(var(--sidebar-background), 0.5);
		backdrop-filter: brightness(60%) blur(1px);
		// }
	}
	&.show-global-nav {
		top: 50px;
	}
	div.children {
		height: 100%;
		padding: ${props => (props.noPadding ? "0" : "50px 20px")};

		&.vcenter {
			height: inherit;
			display: flex;
			flex-direction: column;
			justify-content: center;
			// min-width: 350px;
			// max-width: 450px;
			margin: 0 auto;
			padding: 0 20px;
		}
	}
	&.show-global-nav div.children.vcenter {
		margin-top: -50px;
	}
`;

const VerticallyCentered = styled.div``;

interface ModalContextType {
	zIndex: number;
}

export const ModalContext = React.createContext<ModalContextType>({
	zIndex: 52
});

export interface ModalProps {
	onClose?: (e: any) => void;
	verticallyCenter?: boolean;
	translucent?: boolean;
	showGlobalNav?: boolean;
	noPadding?: boolean;
	noScroll?: boolean;
}

export function Modal(props: PropsWithChildren<ModalProps>) {
	let modalRoot = useModalRoot();
	const dispatch = useDispatch();
	const [context] = React.useState<ModalContextType>(() => ({ zIndex: 3000 }));
	const disposables: { dispose(): void }[] = [];

	const [rerender, setRerender] = React.useState<boolean>(false);

	useDidMount(() => {
		if (props.onClose) {
			disposables.push(
				KeystrokeDispatcher.withLevel(),
				KeystrokeDispatcher.onKeyDown(
					"Escape",
					(event: KeyboardEvent) => {
						if (props.onClose) {
							event.stopPropagation();
							props.onClose(event);
						}
					},
					{ source: "Modal.tsx", level: -1 }
				)
			);
		}

		// check to make sure we've got the right element. if not, that's
		// because #modal-root hasn't mounted yet so we need to
		// trigger a re-render of the main Stream/index by invoking a blur
		if (modalRoot.tagName === "SPAN") {
			setTimeout(() => dispatch(contextActions.blur()), 1000);
			dispatch(contextActions.focus());
		}

		return () => {
			disposables && disposables.forEach(_ => _.dispose());
		};
	});

	const checkClose = e => {
		return; // closing when clicking the field is too disruptive w/menus
		// if (e.target.id === "modal-children" && props.onClose) props.onClose(e);
	};

	return createPortal(
		<ModalContext.Provider value={context}>
			<ModalWrapper
				noPadding={props.noPadding}
				className={`${props.translucent ? "translucent " : ""}${
					props.showGlobalNav ? "show-global-nav " : ""
				}`}
			>
				{props.onClose && <CancelButton onClick={props.onClose} />}
				{props.noScroll ? (
					props.children
				) : (
					<ScrollBox>
						<div className="vscroll">
							<div
								onClick={checkClose}
								id="modal-children"
								className={props.verticallyCenter ? "vcenter children" : "children"}
							>
								{props.children}
							</div>
						</div>
					</ScrollBox>
				)}
			</ModalWrapper>
		</ModalContext.Provider>,
		modalRoot
	);
}

const CancelButton = styled(function(props: { onClick: (e: any) => void }) {
	// have to pass overlayStyle to bump z-index within #modal-root
	return (
		<Tooltip
			placement="left"
			overlayStyle={{ zIndex: "3000" }}
			title={
				<span>
					Close <span className="keybinding">ESC</span>
				</span>
			}
		>
			<span {...props}>
				<Icon name="x" />
			</span>
		</Tooltip>
	);
})`
	cursor: pointer;
	position: absolute;
	right: 12px;
	top: 10px;
	padding: 5px 8px 5px 8px;
	z-index: 30;
	:hover {
		color: var(--text-color-highlight);
		background-color: var(--base-background-color);
	}
`;
