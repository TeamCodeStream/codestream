import { Picker, store } from "emoji-mart";
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { connect } from "react-redux";
import { logWarning } from "../logger";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { safe, shortUuid } from "../utils";
import * as actions from "./actions";
import { ModalContext } from "./Modal";

/**
 * Modal emoji picker that attaches to #modal-root
 */
export class SimpleEmojiPicker extends Component {
	disposables = [];

	constructor(props) {
		super(props);
		this.el = document.createElement("div");
		this.state = {};

		store.setHandlers({
			// keys are "skin", "frequently", and "last"
			getter: key => {
				return safe(() => this.props.currentUser.preferences["emojiPicker-" + key]);
			},

			setter: (key, value) => {
				this.props.setUserPreference({ prefPath: ["emojiPicker-" + key], value });
			},
		});
	}

	componentDidMount() {
		const modalRoot = document.getElementById("modal-root");
		modalRoot.appendChild(this.el);
		modalRoot.classList.add("active");
		modalRoot.onclick = event => {
			if (event.target.id === "modal-root") {
				this.setState({ closed: true });
			}

			// bit of a hack for determining if the click was inside the modal area but outside of the menu
			// copied from Menu.js
			const randomClassString = `__${shortUuid()}`;
			event.target.classList.add(randomClassString);
			const targetSelector = `.${randomClassString}`;
			const clickedInMenu = this.el.querySelector(targetSelector) != null;
			try {
				if (clickedInMenu) {
					return;
				}
				const clickedInModalRoot = modalRoot.querySelector(targetSelector) != null;
				if (clickedInModalRoot) this.setState({ closed: true });
			} catch {
			} finally {
				event.target.classList.remove(randomClassString);
			}
		};
		if (this.props && this.props.target) {
			const rect = this.props.target.getBoundingClientRect();
			this._div.style.top = rect.top - this._div.offsetHeight + "px";

			if (this.props.align === "left") {
				// const left = rect.right - this._div.offsetWidth + 5;
				// this._div.style.left = left + "px";
			} else {
				let left = rect.right - this._div.offsetWidth + 5;
				if (left < 10) left = 10;
				this._div.style.left = left + "px";
			}

			// check to make sure the menu doesn't display
			// off the top of the screen
			const tooFar = rect.top - this._div.offsetHeight;
			if (tooFar < 50) this._div.style.top = "50px";
		}

		KeystrokeDispatcher.levelUp();
		this.disposables.push(
			KeystrokeDispatcher.onKeyDown(
				"Escape",
				event => {
					this.closePicker();
					this.props.addEmoji("");
				},
				{ source: "EmojiPicker.js", level: -1 }
			)
		);
	}

	componentWillUnmount() {
		try {
			const modalRoot = document.getElementById("modal-root");
			this.closePicker();
			modalRoot.removeChild(this.el);
		} catch (err) {
			logWarning(err);
		} finally {
			KeystrokeDispatcher.levelDown();
			this.disposables.forEach(d => d.dispose());
		}
	}

	closePicker() {
		const modalRoot = document.getElementById("modal-root");
		modalRoot.classList.remove("active");
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.closed && !prevState.closed) {
			this.closePicker();
			this.props.addEmoji("");
			return null;
		}
	}

	render() {
		let { addEmoji, style, target } = this.props;

		return ReactDOM.createPortal(
			<ModalContext.Consumer>
				{({ zIndex }) => (
					<div
						ref={ref => (this._div = ref)}
						style={target ? { position: "absolute", zIndex } : {}}
					>
						<Picker
							autoFocus={this.props.autoFocus}
							onSelect={addEmoji}
							emoji=""
							native={true}
							title=""
							style={style}
							emojisToShowFilter={this.props.emojisToShowFilter}
						/>
					</div>
				)}
			</ModalContext.Consumer>,
			this.el
		);
	}
}

const mapStateToProps = ({ session, users }) => {
	const currentUser = users[session.userId];
	return {
		currentUser,
	};
};

export default connect(mapStateToProps, {
	...actions,
})(SimpleEmojiPicker);
