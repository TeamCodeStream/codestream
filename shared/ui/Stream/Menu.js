import React, { Component } from "react";
import ReactDOM from "react-dom";
import createClassString from "classnames";
import Icon from "./Icon";
import { filter as _filter } from "lodash-es";
import { ModalContext } from "./Modal";
import { shortUuid } from "../utils";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { logWarning } from "../logger";

/**
 * Modal menu that attaches to #modal-root
 */
export default class Menu extends Component {
	disposables = [];
	keydownListener = undefined;

	constructor(props) {
		super(props);
		this.state = {
			selected: props.selected || "",
			isShiftHolded: false,
			itemsRange: props.itemsRange || []
		};
		this.el = document.createElement("div");
		this.count = 0;
		this.programaticScrolling = 0;
	}

	componentDidMount() {
		const modalRoot = document.getElementById("modal-root");
		modalRoot.appendChild(this.el);
		modalRoot.classList.add("active");
		KeystrokeDispatcher.levelUp();

		modalRoot.onclick = event => {
			if (event.target.id === "modal-root") {
				this.setState({ closed: true });
				return;
			}
			// bit of a hack for determining if the click was inside the modal area but outside of the menu
			const randomClassString = `__${shortUuid()}`;
			event.target.classList.add(randomClassString);
			const targetSelector = `.${randomClassString}`;
			const clickedInMenu = this.el.querySelector(targetSelector) != null;
			try {
				if (clickedInMenu) {
					return;
				}
				if (this.props.target && this.props.target.querySelector(targetSelector) != null) {
					return;
				}
				const clickedInModalRoot = modalRoot.querySelector(targetSelector) != null;
				if (clickedInModalRoot) this.setState({ closed: true });
			} catch {
			} finally {
				event.target.classList.remove(randomClassString);
			}
		};
		if (this.el && !this.props.focusInput) {
			const inputs = this.el.getElementsByTagName("input");
			if (inputs[0]) inputs[0].focus();
			else this.el.getElementsByClassName("focus-button")[0].focus();
		}
		this.repositionIfNecessary("MOUNT");

		this.disposables.push(
			KeystrokeDispatcher.onKeyDown(
				"Escape",
				event => {
					// invoke the action callback for entire menu so it can removed
					this.props.action(null);
					event.stopPropagation();
					if (this.props.focusOnSelect) this.props.focusOnSelect.focus();
				},
				{ source: "Menu.js", level: -1 }
			)
		);
		// when a Menu is used within a MessageInput component, we want to be able
		// to re-focus the TEXTAREA (contenteditable div) after the menu closes.
		// we also want to be ablet to respond to keyboard events such as arrow-up
		// or arrow-down to move the selection, when the menu itself doesn't have
		// focus. focusInput and focus-button help make that possible
		if (this.props.focusInput && this.props.focusInput.current) {
			this.props.focusInput.current.addEventListener("keydown", this.handleKeyDown);
		}
		if (this.props.isMultiSelect) {
			document.addEventListener("keydown", this.handleMultiSelectKeyDown);
			document.addEventListener("keyup", this.handleMultiSelectKeyUp);
		}
	}

	repositionIfNecessary(loc) {
		if (this.props && this.props.target) {
			const align = this.props.align || "";
			const rect = this.props.target.getBoundingClientRect();
			if ((this.props.align || "").match(/^dropdown/)) {
				this._div.style.minWidth = rect.width + 20 + "px";
			}

			var computedStyle = window.getComputedStyle(this._div);
			this._div.style.top =
				this.props.valign === "bottom" ? rect.bottom + 10 + "px" : rect.top + "px";

			if (align === "left") {
				// const left = rect.right - this._div.offsetWidth + 5;
				// this._div.style.left = left + "px";
			} else if (align === "center") {
				const targetMiddle = (rect.right + rect.left) / 2;
				const left = targetMiddle - this._div.offsetWidth / 2 + 5;
				// if it's too far off the right of the window
				if (left + this._div.offsetWidth + 10 > window.innerWidth) this._div.style.right = "10px";
				// if it's too far to the left
				else if (left < 10) this._div.style.left = "10px";
				// normal case: reposition centrally
				else this._div.style.left = left + "px";
			} else if (align === "dropdownRight" || align === "bottomRight") {
				this._div.style.top = rect.bottom + "px";
				const right = window.innerWidth - rect.right - parseFloat(computedStyle.paddingRight);
				this._div.style.left = "auto";
				this._div.style.right = right + "px";

				// check to see if we're too far left
				// console.warn("RIGHT: ", right, " width: ", this._div.offsetWidth);
				if (right + this._div.offsetWidth > window.innerWidth) {
					// check to see if we'd be too far right
					if (rect.left + this._div.offsetWidth > window.innerWidth) {
						this._div.style.top = rect.bottom + "px";
						this._div.style.left = "10px";
						this._div.style.right = "auto";
					} else {
						const left = rect.left - parseFloat(computedStyle.paddingRight);
						this._div.style.top = rect.bottom + "px";
						this._div.style.left = left + "px";
						this._div.style.right = "auto";
					}
				}
			} else if (align === "dropdownLeft" || align === "bottomLeft") {
				this._div.style.top = rect.bottom + "px";
				const left = rect.left - parseFloat(computedStyle.paddingRight);
				this._div.style.left = left + "px";
			} else if (align === "dropdownCenter" || align === "botomCenter") {
				const targetMiddle = (rect.right + rect.left) / 2;
				const left = targetMiddle - this._div.offsetWidth / 2 + 5;
				// if it's too far off the right of the window
				if (left + this._div.offsetWidth + 10 > window.innerWidth) this._div.style.right = "10px";
				// if it's too far to the left
				else if (left < 10) this._div.style.left = "10px";
				// normal case: reposition centrally
				else this._div.style.left = left + "px";
				this._div.style.top = rect.bottom + "px";
			} else if (align === "popupRight") {
				this._div.style.top = rect.bottom - this._div.offsetHeight + "px";
				const right = window.innerWidth - rect.right - parseFloat(computedStyle.paddingRight);
				this._div.style.left = "auto";
				this._div.style.right = right + "px";

				// // check to see if we're too far left
				// if (right + this._div.offsetWidth > window.innerWidth) {
				// 	this._div.style.top = rect.bottom + "px";
				// 	const left = rect.left - parseFloat(computedStyle.paddingRight);
				// 	this._div.style.left = left + "px";
				// 	this._div.style.right = "auto";
				// }
			} else {
				// right
				const left = rect.right - this._div.offsetWidth + 5;
				if (left < 10) this._div.style.left = "10px";
				else this._div.style.left = left + "px";
			}

			// check to make sure the menu doesn't display
			// off the bottom of the screen
			const tooFar = rect.top + this._div.offsetHeight + 35 - window.innerHeight;
			if (tooFar > 0 && align !== "popupRight") {
				// if we're a dropdown, alter the height
				if (align.startsWith("bottom") || align.startsWith("dropdown")) {
					// don't go above the top of the screen; check to see if the
					// top is too far near the top.
					if (rect.top - this._div.offsetHeight < 10) this._div.style.top = "10px";
					else this._div.style.top = rect.top - this._div.offsetHeight + "px";
					// const height = window.innerHeight - rect.bottom - 50;
					// const ul = this._div.getElementsByTagName("ul")[0];
					// if (ul) ul.style.maxHeight = height + "px";
				}
				// otherwise, alter the top
				else {
					const newTop = rect.top - tooFar;
					if (newTop > 10) this._div.style.top = newTop + "px";
					else this._div.style.top = "10px";
				}
			}
		}
	}

	repositionSubmenuIfNecessary() {
		if (!this._div) return;
		const $submenus = this._div.querySelectorAll("#active-submenu");
		// console.warn("GOT SUBS: ", $submenus);
		$submenus.forEach(($submenu, index) => {
			if ($submenu) {
				// console.warn("IN THE LOOP DOING: ", $submenu, " INDEX: ", index);
				const parentLI = $submenu.closest("li");
				const parentUL = $submenu.closest("ul");
				const parentRect = parentLI.getBoundingClientRect();
				const rect = $submenu.children[0].getBoundingClientRect();

				const submenuTop = parentLI.offsetTop - parentUL.scrollTop - 6;

				if (index === 0) {
					// the first submenu is relative to the viewport
					// let parentRectRightEdge = parentRect.width + 20;
					let parentRectRightEdge = parentRect.right;
					// line it up optimistically....
					$submenu.style.left = parentRect.width - 11 + "px";

					// check to see if it's off the screen to the right
					const tooFarRight = parentRect.right + rect.width > window.innerWidth;
					// const tooFarRight = parentRectRightEdge + rect.width > window.innerWidth;
					if (tooFarRight) {
						// if it is, first try flipping it to the left of the menu
						// the 20px is for 10px padding times two
						$submenu.style.left = 31 - rect.width + "px";
						// $submenu.style.border = "1px solid red";
						// check again to see if it's too far left now
						if (19 - rect.width + parentRect.left < 0) {
							// if it is, just put it on the right edge of the screen
							$submenu.style.left = "auto";
							$submenu.style.right = 20 + parentRectRightEdge - window.innerWidth + "px";
							$submenu.style.top = parentLI.offsetTop + 16 + "px";
							// $submenu.style.borderBottom = "1px solid green";
							console.warn("************* CHANING TOP");
						}
					}
				} else {
					// sub-submenus are relative to the submenu parent
					const parentRectLeftEdge = parentRect.left;
					const parentRectRightEdge = parentRect.right;
					const parentRectRightEdgeRelative = parentRect.width;

					// line it up optimistically....
					$submenu.style.left = parentRectRightEdgeRelative - 11 + "px";

					// check to see if it's off the screen to the right
					const tooFarRight = parentRect.right + rect.width > window.innerWidth;
					if (tooFarRight) {
						// if it is, first try flipping it to the left of the menu
						// the 20px is for 10px padding times two
						$submenu.style.left = 31 - rect.width + "px";
						// check again to see if it's too far left now
						const a = 19 - rect.width + parentRect.left;
						const tooFarLeft = parentRectLeftEdge - rect.width - 19;
						if (tooFarLeft < 0) {
							// if it is, just put it on the right edge of the screen
							$submenu.style.left = "auto";
							$submenu.style.right = 20 + parentRectRightEdge - window.innerWidth + "px";
							$submenu.style.top = parentLI.offsetTop + 16 + "px";
							// $submenu.style.right = "5px";
							// $submenu.style.top = parentLI.offsetTop + 26 + "px";
							if (rect.width > parentRect.width - 20) {
								$submenu.style.width = parentRect.width - 20 + "px";
							}
						}
					}
				}
				const bottomOfSubmenu = parentRect.top + rect.height;
				if (bottomOfSubmenu > window.innerHeight) {
					const tooFar = window.innerHeight - bottomOfSubmenu;
					$submenu.style.top = `${submenuTop + tooFar}px`;
				} else {
					$submenu.style.top = submenuTop + "px";
				}
			}
		});
	}

	componentWillUnmount() {
		try {
			const modalRoot = document.getElementById("modal-root");
			this.closeMenu();
			modalRoot.removeChild(this.el);
		} catch (err) {
			logWarning(err);
		} finally {
			KeystrokeDispatcher.levelDown();
			this.disposables.forEach(d => d.dispose());
		}
		if (this.props.focusInput && this.props.focusInput.current) {
			this.props.focusInput.current.removeEventListener("keydown", this.handleKeyDown);
			this.keydownListener = undefined;
		}
		if (this.props.isMultiSelect) {
			document.removeEventListener("keydown", this.handleMultiSelectKeyDown);
			document.removeEventListener("keyup", this.handleMultiSelectKeyUp);
		}
	}

	closeMenu() {
		const modalRoot = document.getElementById("modal-root");
		modalRoot.classList.remove("active");
	}

	isEllipsisActive(element) {
		return element.offsetWidth < element.scrollWidth;
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.closed && !prevState.closed) {
			this.closeMenu();
			if (this.props.action) this.props.action();
			return null;
		}
		if (this.props.items.length !== prevProps.items.length && !this.repositionMinimally)
			this.repositionIfNecessary("UPDATE");
		if (this.state.selected !== prevState.selected) this.repositionSubmenuIfNecessary();

		if (this.state.q !== prevState.q) {
			// if, after performing the search, there is only one item left, then select it
			const filteredItems = this.filterItems(this.props.items, true);
			if (filteredItems.length === 1)
				this.setState({ selected: this.calculateKey(filteredItems[0]) });
		}

		const $lis = document.querySelectorAll("li.menu-item");
		const numLis = $lis.length;
		for (let i = 0; i < numLis; i++) {
			if (this.isEllipsisActive($lis[i]))
				$lis[i].setAttribute("title", $lis[i].querySelector(".label").innerHTML);
		}
	}

	calculateKey(item, parentItem, grandParentItem, grandGrandParentItem) {
		let key = item.key || item.action;
		if (parentItem) {
			const parentKey = parentItem.key || parentItem.action;
			key = parentKey + "/" + key;
		}
		if (grandParentItem) {
			const grandParentKey = grandParentItem.key || grandParentItem.action;
			key = grandParentKey + "/" + key;
		}
		if (grandGrandParentItem) {
			const grandGrandParentKey = grandGrandParentItem.key || grandGrandParentItem.action;
			key = grandGrandParentKey + "/" + key;
		}
		return key;
	}

	renderItem = (item, parentItem, grandParentItem, grandGrandParentItem, keys, index) => {
		if (item.label === "-") return <hr key={"hr-" + this.count++} />;
		if (item.type === "static") {
			this.count++;
			return <li className="menu-item static">{item.label}</li>;
		}
		if (item.fragment) return item.fragment;
		const key = keys[index];
		let selected = key === this.state.selected || (this.state.selected + "").startsWith(key + "/");
		if (item.type === "search") {
			selected = false;
		}
		const itemIndex = keys.findIndex(_ => _ === key);
		// default selection range
		if (!this.state.selected && this.state.itemsRange.length >= 1 && item.inRange) {
			const startRangeSelectedIndex = keys.findIndex(_ => _ === this.state.itemsRange.slice(0)[0]);
			const endRangeSelectedIndex = keys.findIndex(_ => _ === this.state.itemsRange.slice(-1)[0]);
			selected = itemIndex >= startRangeSelectedIndex && itemIndex <= endRangeSelectedIndex;
		}
		// current selection range
		if (this.state.isShiftHolded && this.state.itemsRange.length === 1 && item.inRange) {
			const startRangeSelectedIndex = keys.findIndex(_ => _ === this.state.itemsRange[0]);
			const currentSelectedIndex = keys.findIndex(
				_ => _ === this.state.selected || _ === (this.state.selected + "").startsWith(key + "/")
			);
			selected =
				(startRangeSelectedIndex >= itemIndex && currentSelectedIndex <= itemIndex) ||
				(currentSelectedIndex >= itemIndex && startRangeSelectedIndex <= itemIndex);
		}

		if (item.type === "title") {
			return <h3>{item.title}</h3>;
		}

		return (
			<li
				className={createClassString({
					"menu-item": true,
					disabled: item.disabled,
					destructive: item.destructive,
					hover: selected && !item.noHover && !item.customHover,
					"range-hover": this.state.isShiftHolded,
					"custom-hover": selected && item.customHover,
					"has-submenu": item.submenu ? true : false
				})}
				id={`li-item-${key}`}
				key={key}
				onMouseEnter={() => this.handleMouseEnter(key)}
				onClick={event => this.handleClickItem(event, item)}
			>
				{item.floatRight && <span className="float-right">{item.floatRight.label}</span>}
				{item.checked === false && <span className="checkmark"> </span>}
				{item.checked === true && <span className="checkmark">✔</span>}
				{item.checked === "dot" && <span className="checkmark">&middot;</span>}
				{item.icon && <span className="icon">{item.icon}</span>}
				{item.submenu && <Icon name="triangle-right" className="triangle-right" />}
				{item.label && <span className="label">{item.label}</span>}
				{item.subtle && <span className="subtle">{item.subtle}</span>}
				{item.shortcut && <span className="shortcut">{item.shortcut}</span>}
				{item.subtextWide && <div className="subtext-wide">{item.subtextWide}</div>}
				{item.subtext && <div className="subtext">{item.subtext}</div>}
				{item.subtextNoPadding && <div className="subtext-no-padding">{item.subtextNoPadding}</div>}
				{item.disabled && <span className="disabled">{item.disabled}</span>}
				{item.submenu && (
					<span className="submenu">
						{selected && this.renderSubmenu(item, parentItem, grandParentItem)}
					</span>
				)}
				{item.type === "search" && (
					<input
						className="input-text control"
						style={{ width: "100%" }}
						type="text"
						ref={ref => (this._searchInput = ref)}
						placeholder={item.placeholder}
						onChange={this.changeSearch}
						autoFocus
					/>
				)}
			</li>
		);
	};

	changeSearch = e => {
		this.changeSearchValue(e.target.value);
	};

	changeSearchValue = q => {
		this.setState({ q });
		if (this.props.onChangeSearch) this.props.onChangeSearch(q);
	};

	renderSubmenu = (parentItem, grandParentItem, grandGrandParentItem) => {
		const leftClass = this.props.align === "center" ? " left" : "";
		return (
			<div id="active-submenu" className={`menu-popup-submenu${leftClass}`}>
				{this.renderMenu(parentItem.submenu, parentItem, grandParentItem, grandGrandParentItem)}
			</div>
		);
	};

	filterItems = (items, skipDisabled) => {
		let count = 0;
		const q = (this.state.q || "").toLowerCase();

		const filteredItems = _filter(items, item => {
			if (skipDisabled && item.disabled) {
				return false;
			} else if (skipDisabled && item.label === "-") {
				return false;
			} else if (skipDisabled && item.type === "search") {
				return false;
			} else if (skipDisabled && item.noHover) {
				return false;
			} else if (q.length && item.skipSearch) {
				return false;
			} else if (item.searchLabel !== undefined && !item.searchLabel.toLowerCase().includes(q)) {
				return false;
				// maxitems doesn't work yet....
			} else if (count < this.props.startItem || count > this.props.maxItems) {
				return false;
			} else {
				count++;
				return true;
			}
		});

		return filteredItems;
	};

	renderMenu = (items, parentItem, grandParentItem, grandGrandParentItem) => {
		let itemsToRender = this.filterItems(items);
		// submenus don't get the dropdown no-top-corners treatment
		const dropdown =
			(this.props.align || "").match(/^dropdown/) &&
			!parentItem &&
			!grandParentItem &&
			!grandGrandParentItem;
		const popup =
			(this.props.align || "").match(/^popup/) &&
			!parentItem &&
			!grandParentItem &&
			!grandGrandParentItem;
		const keys = itemsToRender.map(itemToRender =>
			this.calculateKey(itemToRender, parentItem, grandParentItem, grandGrandParentItem)
		);

		return (
			<div
				className={createClassString("menu-popup-body", {
					dropdown,
					popup,
					"center-title": this.props.centerTitle,
					"limit-width": this.props.limitWidth,
					"full-width": this.props.fullWidth && !parentItem
				})}
			>
				{this.props.title && !parentItem && !grandParentItem && !grandGrandParentItem && (
					<h3>
						{this.props.backIcon && <span className="back-icons">{this.props.backIcon}</span>}
						{this.props.title}
						<span className="icons">
							{this.props.titleIcon}
							{!this.props.noCloseIcon && <Icon onClick={e => this.props.action(e)} name="x" />}
						</span>
					</h3>
				)}
				<ul className="compact">
					{itemsToRender.map((item, index) =>
						this.renderItem(item, parentItem, grandParentItem, grandGrandParentItem, keys, index)
					)}
				</ul>
				<button
					className="focus-button"
					style={{ position: "absolute", left: "-10000px" }}
					onKeyDown={this.handleKeyDown}
				></button>
			</div>
		);
	};

	render() {
		this.count = 0;
		let className = this.props.compact ? "menu-popup compact" : "menu-popup";
		if (this.props.wrap) className += " wrap";
		/*
			Using the ModalContext z-index as an override in case this is being rendered from inside a Modal,
			where it needs a z index equivalent to the modal
		*/
		return ReactDOM.createPortal(
			<ModalContext.Consumer>
				{({ zIndex }) => (
					<div
						style={{ zIndex }}
						className={className}
						ref={ref => (this._div = ref)}
						onKeyDown={this.handleKeyDown}
					>
						{this.renderMenu(this.props.items, null)}
					</div>
				)}
			</ModalContext.Consumer>,
			this.el
		);
	}

	findIndex(key, items) {
		let index = -1;
		items.map((item, counter) => {
			if (key === this.calculateKey(item)) index = counter;
		});
		return index;
	}

	// the keypress handler for tracking up and down arrow and enter
	handleMenuKeyPress = (event, eventType) => {
		const { selected } = this.state;
		event.preventDefault();
		let newIndex = 0;
		const filteredItems = this.filterItems(this.props.items, true);
		const selectedIndex = this.findIndex(selected, filteredItems);
		if (eventType == "down") {
			if (selectedIndex < filteredItems.length - 1) {
				newIndex = selectedIndex + 1;
			} else {
				newIndex = 0;
			}
		} else if (eventType == "up") {
			if (selectedIndex == 0) {
				newIndex = filteredItems.length - 1;
			} else {
				newIndex = selectedIndex - 1;
			}
		} else if (eventType == "tab") {
			// this.handleSelectAtMention();
		} else if (eventType === "enter") {
			const item = filteredItems[selectedIndex];
			this.handleClickItem(event, item);
		}
		const selectedItem = filteredItems[newIndex];
		const key = this.calculateKey(selectedItem);

		this.setState({ selected: key });

		// while we manually scroll the viewport, we do not want
		// the mouseEnter events to fire, which would select
		// the "wrong" menu item. So we set a value and a timer
		// to clear it.
		this.programaticScrolling++;
		const element = document.getElementById("li-item-" + key);
		if (element) element.scrollIntoView({ behavior: "smooth", block: "nearest" });
		setTimeout(() => {
			this.programaticScrolling--;
		}, 750);
	};

	handleKeyDown = event => {
		if (event.key === "ArrowUp" || event.which === 38) {
			event.stopPropagation();
			this.handleMenuKeyPress(event, "up");
		}
		if (event.key === "ArrowDown" || event.which === 40) {
			event.stopPropagation();
			this.handleMenuKeyPress(event, "down");
		}
		if (event.key === "Tab") this.handleMenuKeyPress(event, "tab");
		if (event.key === "Enter" || event.which === 13) {
			event.preventDefault();
			this.handleMenuKeyPress(event, "enter");
		}
	};

	handleMultiSelectKeyDown = event => {
		if (event.key === "Shift" || event.which === 16) {
			if (!this.state.isShiftHolded) {
				this.setState({ isShiftHolded: true, itemsRange: [] });
			}
		}
	};

	handleMultiSelectKeyUp = event => {
		if (event.key === "Shift" || event.which === 16) {
			if (!this.state.isShiftHolded) {
				this.setState({ isShiftHolded: false, itemsRange: [] });
			}
		}
	};

	handleMouseEnter = key => {
		if (!this.programaticScrolling) this.setState({ selected: key });
	};

	handleClickItem = async (event, item) => {
		if (this.state.isShiftHolded && item.inRange) {
			switch (this.state.itemsRange.length) {
				case 0:
					this.setState({ itemsRange: [this.calculateKey(item)] });
					return;
				case 1:
					const actualItemsRange = this.state.itemsRange;
					actualItemsRange.push(this.calculateKey(item));
					this.setState({ itemsRange: actualItemsRange });
					item.action(actualItemsRange);
					this.props.action(null);
					return;
				default:
					this.setState({ itemsRange: [this.calculateKey(item)] });
					return;
			}
		}

		event.stopPropagation();
		if (item.type === "search" || item.type === "static") return;

		// when you select an item, clear out the search field
		if (this._searchInput) {
			this._searchInput.value = "";
			this.changeSearchValue("");
			this._searchInput.focus();
		}

		// support functions as item actions
		if (typeof item.action === "function" && !item.disabled) {
			item.action();
			if (this.props.dontCloseOnSelect) {
				if (!this.props.repositionMinimally) this.repositionIfNecessary(item);
			} else {
				// invoke the action callback for entire menu so it can removed
				this.props.action(null);
			}
		} else this.props.action(item.disabled ? null : item.action);
		if (this.props.focusOnSelect) this.props.focusOnSelect.focus();
	};
}
