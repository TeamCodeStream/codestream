import React, { Component } from "react";
import ReactDOM from "react-dom";
import createClassString from "classnames";
import Button from "./Button";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { logWarning } from "../logger";

// A variant on the Confirm component that handles multi-stage dialogs
export default class MultiStageConfirm extends Component {
	disposables = [];

	constructor(props) {
		super(props);
		this.state = { selected: props.selected, loading: null, stage: 0 };
		this.el = document.createElement("div");
	}

	componentDidMount() {
		const modalRoot = document.getElementById("confirm-root");
		modalRoot.appendChild(this.el);
		modalRoot.classList.add("active");
		this.disposables.push(
			KeystrokeDispatcher.withLevel(),
			KeystrokeDispatcher.onKeyDown(
				"Escape",
				event => {
					event.stopPropagation();
					this.closePopup();
				},
				{ source: "Confirm.js", level: -1 }
			)
		);

		this.el.getElementsByTagName("button")[0].focus();
	}

	componentWillUnmount() {
		try {
			this.closePopup();
		} catch (err) {
			logWarning(err);
		} finally {
			this.disposables.forEach(d => d.dispose());
		}
	}

	advance = () => {
		this.setState({ stage: this.state.stage + 1 });
	};

	closePopup = () => {
		const modalRoot = document.getElementById("confirm-root");
		modalRoot.classList.remove("active");
		// modalRoot.removeChild(this.el);
		ReactDOM.unmountComponentAtNode(modalRoot);
	};

	componentDidUpdate(prevProps, prevState) {
		if (this.state.closed && !prevState.closed) {
			this.closeMenu();
			this.props.action && this.props.action();
			return null;
		}
	}

	handleClick = event => {
		const { closeOnClickA } = this.props;
		if (closeOnClickA && event && event.target.tagName === "A") {
			this.closePopup();
		}
	};

	renderMessage(message) {
		if (message) {
			return (
				<div className="confirm-message" onClick={this.handleClick}>
					{typeof message === "function" ? message() : message}
				</div>
			);
		}
	}

	render() {
		const stage = this.props.stages[this.state.stage];
		const bodyClass = createClassString(this.props.className || "", {
			"confirm-popup-body": true,
			centered: this.props.centered
		});

		return ReactDOM.createPortal(
			<div className="confirm-popup" ref={ref => (this._div = ref)}>
				<div className={bodyClass}>
					{stage.title && <div className="confirm-title">{stage.title}</div>}
					{this.renderMessage(stage.message)}
					<div className="button-group">
						{stage.buttons.map((button, index) => {
							const buttonClass = createClassString(
								{
									"control-button": true,
									cancel: !button.action && !button.uri && !button.className && !button.advance
								},
								button.className
							);

							const onClick = button.advance
								? () => {
										const nextStageNumber = this.state.stage + 1;
										if (nextStageNumber >= this.props.stages.length) {
											this.closePopup();
										} else {
											this.setState({ stage: nextStageNumber });
										}
								  }
								: async e => {
										if (button.action) {
											this.setState({ loading: button.label });
											try {
												const result = button.action(e);
												if (button.wait) await result;
											} catch (error) {
												if (button.wait) {
													/* TODO communicate error */
												}
											} finally {
												this.setState({ loading: false });
												this.closePopup();
											}
										} else this.closePopup();
								  };

							const buttonComponent = (
								<Button
									className={buttonClass}
									onClick={onClick}
									key={button.label}
									loading={this.state.loading === button.label}
									tabIndex={0}
								>
									{button.label}
								</Button>
							);

							return button.uri ? <a href={button.uri}>{buttonComponent}</a> : buttonComponent;
						})}
					</div>
				</div>
			</div>,
			this.el
		);
	}
}

export const multiStageConfirmPopup = properties => {
	const root = document.getElementById("confirm-root");
	root.classList.add("active");
	ReactDOM.render(<MultiStageConfirm {...properties} />, root);
};
