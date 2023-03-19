import cx from "classnames";
import React from "react";
import ReactDOM from "react-dom";
import { connect } from "react-redux";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import { CodeStreamState } from "../store";
import { setShowFeedbackSmiley } from "../store/context/actions";
import KeystrokeDispatcher from "../utilities/keystroke-dispatcher";
import { HostApi } from "../webview-api";
import Button from "./Button";
import CancelButton from "./CancelButton";
import Icon from "./Icon";

interface State {
	emotion: "happy" | "sad";
	tweet: string;
	dialogOpen: boolean;
	isLoading?: boolean;
	charsLeft: number;
}
interface Props {
	showFeedbackSmiley?: boolean;

	setShowFeedbackSmiley: (
		...args: Parameters<typeof setShowFeedbackSmiley>
	) => ReturnType<typeof setShowFeedbackSmiley>;
}

const MAX_TWEET_LENGTH = 240;

export class Feedback extends React.Component<Props, State> {
	static defaultProps = {};
	el: HTMLDivElement;

	constructor(props: Props) {
		super(props);
		this.state = {
			emotion: "happy",
			dialogOpen: false,
			charsLeft: 240,
			tweet: "",
		};
		this.el = document.createElement("div");
	}

	openDialog() {
		KeystrokeDispatcher.levelUp();
		const modalRoot = document.getElementById("modal-root");
		if (modalRoot) {
			modalRoot.appendChild(this.el);
			modalRoot.classList.add("active");
			modalRoot.classList.add("blanket");
			modalRoot.onclick = event => {
				const castTarget = event.target as HTMLElement;
				if (castTarget && castTarget.id === "modal-root") {
					this.closeDialog();
				}
			};
		}
		this.setState({ dialogOpen: true });
	}

	closeDialog() {
		KeystrokeDispatcher.levelDown();
		const modalRoot = document.getElementById("modal-root");
		if (modalRoot) {
			modalRoot.classList.remove("active");
			modalRoot.classList.remove("blanket");
			modalRoot.removeChild(this.el);
		}
		this.setState({ dialogOpen: false });
	}

	renderDialogIfOpen() {
		const { dialogOpen, emotion } = this.state;

		if (!dialogOpen) return null;

		return ReactDOM.createPortal(
			<div className="feedback-popup">
				<div className="dialog standard-form" style={{ padding: 0 }}>
					<div className="form-body">
						<div id="controls">
							<CancelButton className="clickable" onClick={this.toggleDialog} title="Close" />
							<h2>Tweet us your CodeStream feedback.</h2>
							<div className="contact-us">
								<h4>Other ways to contact us</h4>
								<a href="mailto:team@codestream.com?Subject=Feedback">Email Us</a>
								<br />
								<a href="https://github.com/TeamCodeStream/CodeStream/issues/new">Report a Bug</a>
							</div>
							How was your experience?
							<div className="emotion">
								<Icon
									name="happy"
									className={cx({ selected: emotion === "happy" })}
									onClick={this.selectHappy}
								/>
								<Icon
									name="sad"
									className={cx({ selected: emotion === "sad" })}
									onClick={this.selectSad}
								/>
							</div>
							<div style={{ clear: "both" }} />
							Tell us why?{" "}
							<span
								className={cx({
									warn: this.state.charsLeft < 5,
								})}
							>
								({this.state.charsLeft} characters left)
							</span>
							<textarea
								maxLength={MAX_TWEET_LENGTH}
								className="input-text"
								onChange={this.onChangeText}
							/>
							<Button
								style={{
									paddingLeft: "10px",
									paddingRight: "15px",
									width: "auto",
									float: "right",
									fontSize: "15px",
								}}
								className="control-button"
								type="submit"
								loading={this.state.isLoading}
								onClick={this.handleClickTweet}
								disabled={this.state.tweet.length === 0}
							>
								<Icon name="twitter" />
								Tweet
							</Button>
							<div className="show-smiley">
								<label className="hint" htmlFor="show-smiley-checkbox">
									<input
										type="checkbox"
										onClick={this.toggleShowSmiley}
										id="show-smiley-checkbox"
										checked={this.props.showFeedbackSmiley}
									/>{" "}
									Show Feedback Smiley in CodeStream Panel
								</label>
							</div>
							<div style={{ clear: "both" }} />
						</div>
					</div>
				</div>
			</div>,
			this.el
		);
	}

	render() {
		if (!this.props.showFeedbackSmiley) return null;

		return (
			<div className="feedback">
				{this.renderDialogIfOpen()}
				<Icon
					title="Tweet us your feedback"
					placement="topRight"
					delay={1}
					name="smiley"
					className="clickable happy-icon"
					onClick={this.toggleDialog}
				/>
			</div>
		);
	}

	onChangeText = e => {
		const tweet = e.target.value;
		const charsLeft = tweet.length > MAX_TWEET_LENGTH ? 0 : MAX_TWEET_LENGTH - tweet.length;
		this.setState({ tweet: tweet, charsLeft: charsLeft });
	};

	toggleShowSmiley = () => {
		this.props.setShowFeedbackSmiley(!this.props.showFeedbackSmiley);
	};

	toggleDialog = () => {
		if (this.state.dialogOpen) this.closeDialog();
		else this.openDialog();
	};

	selectHappy = () => {
		this.setState({ emotion: "happy" });
	};

	selectSad = () => {
		this.setState({ emotion: "sad" });
	};

	handleClickTweet = () => {
		const { tweet, emotion } = this.state;

		const queryString = `?${
			emotion === "happy" ? `hashtags=codestreamrocks&` : null
		}ref_src=twsrc%5Etfw&related=twitterapi%2Ctwitter&text=${encodeURIComponent(
			tweet.toString()
		)}&tw_p=tweetbutton&via=teamcodestream`;
		const url = "https://twitter.com/intent/tweet" + queryString;

		HostApi.instance.send(OpenUrlRequestType, { url: url });
		this.closeDialog();
	};
}

const mapStateToProps = ({ context }: CodeStreamState) => {
	return {
		showFeedbackSmiley: context.showFeedbackSmiley,
	};
};

export default connect(mapStateToProps, {
	setShowFeedbackSmiley: setShowFeedbackSmiley,
})(Feedback);
