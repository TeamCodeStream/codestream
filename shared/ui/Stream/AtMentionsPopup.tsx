import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDidMount } from "../utilities/hooks";
import Headshot from "./Headshot";
import { Icon } from "./Icon";
import { ModalContext } from "./ModalContext";

export interface Mention {
	id?: string;
	headshot?: {
		email?: string;
		name?: string;
	};
	description?: string;
	help?: string;
	identifier?: string;
}

// AtMentionsPopup expects an on/off switch determined by the on property
// on = show the popup, off = hide the popup
// a people list, which is the possible list of people to at-mention
// with the format:
// [id, full name, email, headshot]
// and a prefix, which is used to filter/match against the list
export interface AtMentionsPopupProps {
	handleSelectAtMention(selection?: string | number): void;
	handleHoverAtMention(selection?: string): void;
	childRef: React.RefObject<HTMLElement>;
	selected?: string;
	on?: string;
	prefix?: string;
	items: Mention[];
}

export const AtMentionsPopup = (props: React.PropsWithChildren<AtMentionsPopupProps>) => {
	const [renderTarget] = useState(() => document.createElement("div"));
	const rootRef = useRef<HTMLDivElement>(null);
	const { items } = props;
	useDidMount(() => {
		const modalRoot = document.getElementById("modal-root");
		modalRoot!.appendChild(renderTarget);
		return () => {
			modalRoot!.removeChild(renderTarget);
		};
	});

	useLayoutEffect(() => {
		if (props.on && props.childRef.current && rootRef.current) {
			const childRect = props.childRef.current.getBoundingClientRect();
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
			{props.children}
			{props.on && (
				<ModalContext.Consumer>
					{({ zIndex }) =>
						createPortal(
							<div className="mentions-popup" style={{ zIndex }} ref={rootRef}>
								<div className="body">
									<div className="matches">
										<Icon
											onClick={() => props.handleSelectAtMention("__close")}
											name="x"
											className="close"
										/>
										{props.on === "emojis" ? (
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
											? items
													.filter(_ => !_.headshot?.email?.match(/noreply/))
													.map((item: Mention) => {
														const className = item.id == props.selected ? "hover" : "none";
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
											: items.map((item: Mention) => {
													const className = item.id == props.selected ? "hover" : "none";
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
