import React from "react";
import ReactDOM from "react-dom";
import Headshot from "./Headshot";
import Icon from "./Icon";
import { ModalContext } from "./Modal";
import { useDidMount } from "../utilities/hooks";

interface Mention {
	id: string;
	headshot?: {
		email?: string;
		username?: string;
		fullName?: string;
		avatar?: string;
	};
	description?: string;
	help?: string;
	identifier: string;
}

// AtMentionsPopup expects an on/off switch determined by the on property
// on = show the popup, off = hide the popup
// a people list, which is the possible list of people to at-mention
// with the format:
// [id, nickname, full name, email, headshot, presence]
// and a prefix, which is used to filter/match against the list
export interface AtMentionsPopupProps {
	items: Mention[];
	handleSelectAtMention(selection: string): void;
	handleHoverAtMention(selection: string): void;
	selected?: string;
	on?: string;
	prefix?: string;
}

export const AtMentionsPopup = (props: React.PropsWithChildren<AtMentionsPopupProps>) => {
	const [renderTarget] = React.useState(() => document.createElement("div"));
	const rootRef = React.useRef<HTMLDivElement>(null);
	const childRef = React.useRef<any>(null);

	useDidMount(() => {
		const modalRoot = document.getElementById("modal-root");
		modalRoot!.appendChild(renderTarget);
		return () => {
			modalRoot!.removeChild(renderTarget);
		};
	});

	React.useLayoutEffect(() => {
		if (props.on && childRef.current != null && rootRef.current != null) {
			const childRect = (childRef.current.htmlEl as HTMLElement).getBoundingClientRect();
			const height = window.innerHeight;
			rootRef.current.style.width = `${childRect.width}px`;
			rootRef.current.style.left = `${childRect.left}px`;

			// if the child input is above the middle of the viewport, position the popup below, else position above
			if (childRect.top < height / 2) {
				rootRef.current.style.top = `${childRect.bottom + 5}px`;
			} else {
				rootRef.current.style.bottom = `${height - childRect.top + 5}px`;
			}
		}
	}, [props.on]);

	return (
		<>
			{React.Children.map(props.children, (child: any) =>
				React.cloneElement(
					child,
					{
						...child.props,
						ref: node => {
							childRef.current = node;
							// if the child already has a ref, make sure to invoke it
							if (typeof child.ref === "function") child.ref(node);
						}
					},
					child.children
				)
			)}
			{props.on && (
				<ModalContext.Consumer>
					{({ zIndex }) =>
						ReactDOM.createPortal(
							<div className="mentions-popup" style={{ zIndex }} ref={rootRef}>
								<div className="body">
									<div className="matches">
										<Icon
											onClick={() => props.handleSelectAtMention("__close")}
											name="x"
											className="close"
										/>
										{props.on === "slash-commands" ? (
											<span>
												Commands matching{" "}
												<b>
													"/
													{props.prefix}"
												</b>
											</span>
										) : props.on === "channels" ? (
											<span>
												Channels matching{" "}
												<b>
													"#
													{props.prefix}"
												</b>
											</span>
										) : props.on === "emojis" ? (
											<span>
												Emoji matching{" "}
												<b>
													":
													{props.prefix}"
												</b>
											</span>
										) : (
											<span>
												People matching{" "}
												<b>
													"@
													{props.prefix}"
												</b>
											</span>
										)}
									</div>
									<ul className="compact at-mentions-list">
										{props.on === "at-mentions"
											? props.items
													.filter(_ => !_.headshot?.email?.match(/noreply/))
													.map((item: Mention) => {
														let className = item.id == props.selected ? "hover" : "none";
														// the handleClickPerson event needs to fire onMouseDown
														// rather than onclick because there is a handleblur
														// event on the parent element that will un-render
														// this component
														return (
															<li
																className={className}
																key={item.id}
																onMouseEnter={() => props.handleHoverAtMention(item.id)}
																onMouseDown={() => props.handleSelectAtMention(item.id)}
															>
																{item.headshot && <Headshot size={18} person={item.headshot} />}
																<span className="username">{item.identifier}</span>{" "}
																{item.description && (
																	<span className="name">{item.description}</span>
																)}
																{item.help && <span className="help">{item.help}</span>}
															</li>
														);
													})
											: props.items.map((item: Mention) => {
													let className = item.id == props.selected ? "hover" : "none";
													// the handleClickPerson event needs to fire onMouseDown
													// rather than onclick because there is a handleblur
													// event on the parent element that will un-render
													// this component
													return (
														<li
															className={className}
															key={item.id}
															onMouseEnter={() => props.handleHoverAtMention(item.id)}
															onMouseDown={() => props.handleSelectAtMention(item.id)}
														>
															{item.headshot && <Headshot size={18} person={item.headshot} />}
															<span className="username">{item.identifier}</span>{" "}
															{item.description && <span className="name">{item.description}</span>}
															{item.help && <span className="help">{item.help}</span>}
														</li>
													);
											  })}
									</ul>
									<div className="instructions">
										<div>&uarr; or &darr; to navigate</div>
										<div>&crarr; to select</div>
										<div>esc to dismiss</div>
									</div>
								</div>
							</div>,
							renderTarget
						)
					}
				</ModalContext.Consumer>
			)}
		</>
	);
};
