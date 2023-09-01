import React from "react";

const modifier = navigator.appVersion.includes("Macintosh") ? "^ /" : "Ctrl-Shift-/";
const ComposeTitles = {
	comment: (
		<span className="compose-title">
			<span className="binding">
				<span className="keybinding extra-pad">{modifier}</span>
				<span className="keybinding">c</span>
			</span>
			<span className="function">Add Comment</span>{" "}
		</span>
	),
	issue: (
		<span className="compose-title">
			<span className="binding">
				<span className="keybinding extra-pad">{modifier}</span>
				<span className="keybinding">i</span>
			</span>
			<span className="function">Create Issue</span>{" "}
		</span>
	),
	toggleCodeStreamPanel: (
		<span className="compose-title">
			<span className="binding">
				<span className="keybinding extra-pad">{modifier}</span>
				<span className="keybinding extra-pad">{modifier}</span>
			</span>
			<span className="function">Toggle CodeStream Panel</span>{" "}
		</span>
	),
	work: (
		<span className="compose-title">
			<span className="binding">
				<span className="keybinding extra-pad">{modifier}</span>
				<span className="keybinding">w</span>
			</span>
			<span className="function">Start Work</span>{" "}
		</span>
	),

	react: (
		<span className="compose-title">
			<span className="function">Add Reaction</span>
		</span>
	),
};

export const ComposeKeybindings = {
	comment: (
		<span className="binding">
			<span className="keybinding extra-pad">{modifier}</span>
			<span className="keybinding">c</span>
		</span>
	),
	issue: (
		<span className="binding">
			<span className="keybinding extra-pad">{modifier}</span>
			<span className="keybinding">i</span>
		</span>
	),
	toggleCodeStreamPanel: (
		<span className="binding">
			<span className="keybinding extra-pad">{modifier}</span>
			<span className="keybinding extra-pad">{modifier}</span>
		</span>
	),
	work: (
		<span className="binding">
			<span className="keybinding extra-pad">{modifier}</span>
			<span className="keybinding">w</span>
		</span>
	),
};

export default ComposeTitles;
