import Icon from "@codestream/webview/Stream/Icon";
import React, { useState } from "react";
import styled from "styled-components";
import { ButtonRow, Dialog } from "@codestream/webview/src/components/Dialog";
import { Button } from "@codestream/webview/src/components/Button";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";
import { HostApi } from "@codestream/webview/webview-api";
import { Modal } from "../Modal";

const Container = styled.div`
	display: flex;
	justify-content: flex-end;
	column-gap: 10px;
`;

const Root = styled.div`
	width: 100%;
`;

const Controls = styled.div`
	margin-top: 10px;
`;

const FeedbackCompleted = styled.div`
	margin-top: 10px;
	color: green;
`;

export interface GrokFeedbackProps {
	postId: string;
	errorId: string;
}

type FeedbackType = "up" | "down";

export function GrokFeedback(props: GrokFeedbackProps) {
	const [showForm, setShowForm] = useState(false);
	const [type, setType] = useState<FeedbackType | undefined>(undefined);
	const [success, setSuccess] = useState(false);

	const clickHandler = (type: FeedbackType) => {
		setType(type);
		setShowForm(true);
	};

	const onSuccessHandler = () => {
		setShowForm(false);
		setSuccess(true);
	};

	return (
		<div>
			{showForm && type && (
				<Modal translucent>
					<Dialog title={"Grok Feedback"} wide={true} onClose={() => setShowForm(false)}>
						<Root>
							<GrokFeedbackForm {...props} feedbackType={type} onSuccess={onSuccessHandler} />
						</Root>
					</Dialog>
				</Modal>
			)}

			<Container>
				{!success && (
					<>
						<div>
							<Icon name="thumbsup" clickable={true} onClick={() => clickHandler("up")} />
						</div>
						<div>
							<Icon name="thumbsdown" clickable={true} onClick={() => clickHandler("down")} />
						</div>
					</>
				)}
				{success && <FeedbackCompleted>Thank you for your feedback</FeedbackCompleted>}
			</Container>
		</div>
	);
}

export interface GrokFeedbackFormProps extends GrokFeedbackProps {
	feedbackType: FeedbackType;
	onSuccess: () => void;
}

const thumbMap = new Map<FeedbackType, string>([
	["up", "Thumbs Up"],
	["down", "Thumbs Down"],
]);

export function GrokFeedbackForm(props: GrokFeedbackFormProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [text, setText] = useState("");
	const [notTrue, setNotTrue] = useState(false);
	const [notHelpful, setNotHelpful] = useState(false);
	const [isHarmful, setIsHarmful] = useState(false);
	const feedbackText =
		props.feedbackType === "up"
			? "What did you like about the feedback?"
			: "What did you not like about the feedback? How could it be improved?";

	const submitHandler = async () => {
		setIsLoading(true);
		const telemetryPayload = {
			"Error Group ID": props.errorId,
			"Post ID": props.postId,
			Direction: thumbMap.get(props.feedbackType),
		};

		// Only want these telemetry parameters if true, otherwise exclude them from payload
		if (notTrue) {
			telemetryPayload["ResponseNotTrue"] = notTrue;
		}
		if (notHelpful) {
			telemetryPayload["ResponseNotHelpful"] = notHelpful;
		}
		if (isHarmful) {
			telemetryPayload["ResponseHarmful"] = isHarmful;
		}

		console.debug(`Grok feedback ${JSON.stringify(telemetryPayload)}`);
		await HostApi.instance.track("Grok Feedback Submitted", telemetryPayload);
		setIsLoading(false);
		props.onSuccess();
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" && event.metaKey) {
			// command-enter should submit
			event.preventDefault();
			if (text.length > 0) {
				submitHandler();
			}
		}
	};

	return (
		<div>
			<textarea
				className="input-text"
				placeholder={feedbackText}
				onChange={e => setText(e.target.value)}
				onKeyDown={handleKeyDown}
				style={{ width: "100%", resize: "vertical", height: "75px" }}
			/>
			{props.feedbackType === "down" && (
				<Controls>
					<Checkbox name="truth" checked={notTrue} onChange={() => setNotTrue(!notTrue)}>
						This is not true
					</Checkbox>
					<Checkbox name="helpful" checked={notHelpful} onChange={() => setNotHelpful(!notHelpful)}>
						This is not helpful
					</Checkbox>
					<Checkbox name="harmful" checked={isHarmful} onChange={() => setIsHarmful(!isHarmful)}>
						This is harmful or unsafe
					</Checkbox>
				</Controls>
			)}
			<ButtonRow>
				<Tooltip
					title={
						<span>
							Submit Feedback
							<span className="keybinding extra-pad">
								{navigator.appVersion.includes("Macintosh") ? "⌘" : "Ctrl"} ENTER
							</span>
						</span>
					}
					placement="bottomRight"
					delay={1}
				>
					<Button disabled={text.length === 0} onClick={submitHandler} isLoading={isLoading}>
						Submit Feedback
					</Button>
				</Tooltip>
			</ButtonRow>
		</div>
	);
}
