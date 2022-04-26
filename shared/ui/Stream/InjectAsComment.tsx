import cx from "classnames";
import React, { useState, useCallback } from "react";
import { connect } from "react-redux";
import Menu from "./Menu";
import Icon from "./Icon";
import Button from "./Button";
import { prettyPrintOne } from "code-prettify";
import { CSUser, CSMarker } from "@codestream/protocols/api";
import { CodemarkPlus } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { TelemetryRequestType } from "@codestream/protocols/agent";
import { InsertTextRequestType } from "@codestream/protocols/webview";
import { getPostsForStream } from "../store/posts/reducer";
import { fetchThread } from "./actions";
import CancelButton from "./CancelButton";

const noop = () => Promise.resolve();

interface Props {
	cancel: Function;
	setPinned: Function;
	codemark: CodemarkPlus;
	replies: any[];
	author: CSUser;
	fetchThread: Function;
	markerId: String;
}

const mapStateToProps = (state, props) => {
	const { users, context } = state;
	const { codemark } = props;

	let posts = getPostsForStream(codemark.streamId).filter(
		post => post.parentPostId === codemark.postId
	);

	posts.forEach(post => {
		let author = users[post.creatorId];
		if (!author) {
			author = { email: "", fullName: "" };
			if (post.creatorId === "codestream") author.username = "CodeStream";
			else author.username = post.creatorId;
		}
		// @ts-ignore // big no no. don't mutate redux state
		post.author = author;
	});

	return {
		teamId: context.currentTeamId,
		replies: posts
	};
};

export const InjectAsComment = (connect(mapStateToProps, { fetchThread }) as any)(
	(props: Props) => {
		const [archive, setArchive] = useState(false);
		const [wrapAt80, setWrapAt80] = useState(true);
		const [includeReplies, setIncludeReplies] = useState(true);
		const [includeTimestamps, setIncludeTimestamps] = useState(true);
		const [menuOpen, setMenuOpen] = useState(false);
		const [menuTarget, setMenuTarget] = useState<EventTarget>();
		const [selectedCommentStyle, setSelectedCommentStyle] = useState("//");
		const [hasPosts, setHasPosts] = useState(false);

		const inject = () => {
			const marker: CSMarker = props.codemark.markers!.find(
				marker => marker.id === props.markerId
			)!;

			HostApi.instance.send(TelemetryRequestType, {
				eventName: "InjectAsComment",
				properties: { "Author?": false }
			});
			HostApi.instance.send(InsertTextRequestType, {
				marker: marker,
				text: codemarkAsCommentString(),
				indentAfterInsert: false // set this to true once vscode fixes their bug
			});
			props.cancel();
			if (archive) props.setPinned(false);
		};

		const selectCommentStyle = style => {
			setMenuOpen(false);
			if (style) setSelectedCommentStyle(style);
		};

		// key => [ initial, per-line, final ]
		const commentStyles = {
			"//": ["", "// ", ""],
			"/*": ["/* ", " * ", " */"],
			"#": ["", "# ", ""],
			"<!-- -->": ["<!-- ", "  ", " -->"],
			"'": ["", "' ", ""]
		};

		const stringDivider = (str, width, prefix, postfix) => {
			if (str.length > width) {
				var p = width;
				for (; p > 0 && !/\s/.test(str[p]); p--) {}
				if (p > 0) {
					var left = str.substring(0, p);
					var right = str.substring(p + 1);
					return prefix + left + postfix + stringDivider(right, width, prefix, postfix);
				}
			}
			return prefix + str + postfix;
		};

		const makeComment = (string, style) => {
			const pattern = commentStyles[style];
			const lines = string.split("\n");

			if (lines.length == 1 && pattern[0].length) return pattern[0] + string + pattern[2];

			let comment = pattern[0] ? pattern[0] + "\n" : "";
			string.split("\n").map(line => {
				if (wrapAt80) {
					comment += stringDivider(line, 80, pattern[1], "\n");
				} else {
					comment += pattern[1] + line + "\n";
				}
				// comment += stringDivider(line, 80, pattern[1], "\n");
			});
			if (pattern[2]) comment += pattern[2] + "\n";
			return comment;
		};

		let items = [] as any;
		["//", "/*", "#", "<!-- -->", "'"].forEach(style => {
			items.push({
				label: <div className="monospace">{makeComment("the quick brown fox", style)}</div>,
				action: style
			});
		});

		const codemarkAsCommentString = () => {
			const { codemark, replies, author } = props;

			let string =
				(author.fullName || author.username) + prettyTimestamp(codemark.createdAt) + "\n";
			string += codemark.title ? codemark.title + "\n\n" + codemark.text : codemark.text;
			if (codemark.externalProviderUrl) string += "\n\n" + codemark.externalProviderUrl;

			if (includeReplies) {
				replies.forEach(reply => {
					const { author, text = "", createdAt } = reply;
					string +=
						"\n\n" + (author.fullName || author.username) + prettyTimestamp(createdAt) + "\n";
					string += text.trim();
				});
			}
			return makeComment(string, selectedCommentStyle);
		};

		const prettyTimestamp = function(time) {
			if (!includeTimestamps) return ":";

			if (!time) return "";

			let dateStamp = new Intl.DateTimeFormat("en", {
				day: "numeric",
				month: "short",
				year: "numeric"
			}).format(time);

			let timeStamp;
			timeStamp = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
				time
			);
			timeStamp = timeStamp.replace(/^0:/, "12:");

			return " on " + dateStamp + " at " + timeStamp;
		};

		const getPosts = async function() {
			const { codemark } = props;
			await props.fetchThread(codemark.streamId, codemark.postId);
		};

		if (!hasPosts) {
			setHasPosts(true);
			getPosts();
		}

		return (
			<form id="inject-form" className="standard-form">
				<fieldset className="form-body">
					{/* <p className="explainer">describe what is happening here</p> */}
					<div id="controls">
						<div id="comment-style" className="control-group">
							<span
								className="channel-label"
								onClick={e => {
									setMenuOpen(!menuOpen);
									setMenuTarget(e.target);
								}}
							>
								Comment Type:&nbsp;&nbsp;
								<code>{makeComment("the quick brown fox", selectedCommentStyle)}</code>{" "}
								<Icon name="chevron-down" />
								{menuOpen && (
									<Menu
										align="center"
										compact={true}
										target={menuTarget}
										items={items}
										action={selectCommentStyle}
									/>
								)}
							</span>
						</div>
						<div id="switches" className="control-group">
							<div onClick={() => setIncludeTimestamps(!includeTimestamps)}>
								<div className={cx("switch", { checked: includeTimestamps })} /> Include timestamps
							</div>
							<div onClick={() => setIncludeReplies(!includeReplies)}>
								<div className={cx("switch", { checked: includeReplies })} /> Include replies
							</div>
							<div onClick={() => setWrapAt80(!wrapAt80)}>
								<div className={cx("switch", { checked: wrapAt80 })} /> Wrap at 80 chars
							</div>
							<div onClick={() => setArchive(!archive)}>
								<div className={cx("switch", { checked: archive })} /> Archive codemark after
								injecting comment
							</div>
						</div>
					</div>
					<div style={{ marginTop: "10px" }} className="related-label">
						PREVIEW
					</div>
					<pre className="code prettyprint preview">{codemarkAsCommentString()}</pre>
					<div
						key="buttons"
						className="button-group"
						style={{
							marginLeft: "10px",
							marginTop: "5px",
							float: "right",
							width: "auto",
							marginRight: 0
						}}
					>
						<CancelButton onClick={props.cancel} mode="button" />
						<Button
							key="submit"
							style={{
								paddingLeft: "20px",
								paddingRight: "20px",
								marginRight: 0
							}}
							className="control-button"
							type="submit"
							onClick={inject}
						>
							Inject
						</Button>
					</div>
				</fieldset>
			</form>
		);
	}
);
