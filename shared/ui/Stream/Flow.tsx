import React from "react";
import { Carousel, Content } from "../src/components/Carousel";
import styled from "styled-components";
import Icon from "./Icon";
import { useRect } from "../utilities/hooks";
import { Tab, Tabs } from "../src/components/Tabs";
import { HostApi } from "../webview-api";
import { PanelHeader } from "../src/components/PanelHeader";
import ScrollBox from "./ScrollBox";
import CancelButton from "./CancelButton";
import { closePanel } from "./actions";
import { useDispatch, useSelector } from "react-redux";
import { Dialog } from "../src/components/Dialog";

const Root = styled.div`
	color: var(--text-color);
	position: relative;
	h2,
	h3 {
		color: var(--text-color-highlight);
	}

	h3 {
		margin: 30px 0 5px 0;
		.icon {
			margin-right: 5px;
			vertical-align: -2px;
		}
	}
	${Carousel} {
		display: inline-block;
		max-width: 600px;
	}
`;

const Diagram = styled.div`
	position: relative;
	display: inline-block;
	width: 600px;
	height: 175px;
	transform-origin: top left;
	// background: rgba(127, 127, 127, 0.05);
`;

const Contents = styled.div`
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
`;

export const GitTimeline = styled.div`
	position: absolute;
	top: 30px;
	width: 100%;
	height: 3px;
	background: #999;
	margin-top: -1px;

	&:after {
		content: "";
		position: absolute;
		right: -6px;
		top: -5px;
		width: 0;
		height: 0;
		border-top: 7px solid transparent;
		border-left: 15px solid #999;
		border-bottom: 7px solid transparent;
		transition: transform ease-out 0.2s;
	}

	.simplified & {
		top: 123px;
		width: 200px;
		right: 0;
		&:before {
			content: "";
			position: absolute;
			left: -400px;
			width: 280px;
			height: 3px;
			background: #999;
		}
	}

	.adhoc & {
		top: 123px;
		top: 25px;
	}
`;

export const BranchLineDown = styled.div`
	position: absolute;
	width: 3px;
	background: #999;
	height: 50px;
	top: 50px;
	left: 70px;
`;

export const BranchCurve = styled.div`
	position: absolute;
	top: 75px;
	left: 70px;
	width: 3px;
	width: 50px;
	height: 50px;
	border: 3px solid #999;
	border-color: #999 transparent transparent transparent;
	border-radius: 50%;
	transform: rotate(225deg);
`;

export const BranchLineAcross = styled.div`
	position: absolute;
	height: 3px;
	width: 186px;
	background: #999;
	top: 122px;
	left: 95px;
`;

const MergeLineDown = styled.div`
	position: absolute;
	width: 3px;
	background: #999;
	height: 50px;
	top: 50px;
	right: 70px;
`;

const MergeLineAcross = styled.div`
	position: absolute;
	height: 3px;
	width: 106px;
	background: #999;
	top: 122px;
	left: 399px;
	z-index: 0;
`;

const MergeCurve = styled.div`
	position: absolute;
	top: 75px;
	right: 70px;
	width: 3px;
	width: 50px;
	height: 50px;
	border: 3px solid #999;
	border-color: #999 transparent transparent transparent;
	border-radius: 50%;
	transform: rotate(135deg);
`;

const Action = styled.div`
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: #999;
	top: 103px;
	.adhoc & {
		top: 25px;
	}
	z-index: 2;
	&:before {
		content: "";
		position: absolute;
		top: 3px;
		left: 3px;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--base-border-color);
	}
	.icon {
		display: inline-block;
		transform: scale(1.5);
		color: #999;
	}
	transition: transform ease-out 0.2s;
	&.active,
	&:hover:not(.no-hover) {
		z-index: 3;
		background: var(--button-background-color);
		color: var(--button-foreground-color);

		background: #999;
		color: var(--base-border-color);

		.icon {
			color: var(--button-foreground-color);

			color: var(--base-border-color);
		}
		&:before {
			background: #999;
			// background: var(--button-background-color);
		}
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
		transform: scale(1.5);
	}
`;

export const GitBranch = styled(Action)`
	top: 10px;
	left: 52px;
	.icon {
		margin-left: 1px;
	}
`;

const GrabTicket = styled(Action)`
	left: 40px;
	svg {
		padding: 1px 0 0 0;
	}
`;

const GitMerge = styled(Action)`
	top: 10px;
	right: 52px;
	.icon {
		margin-left: 1px;
	}
`;

const Upload = styled(Action)`
	left: 520px;
`;

const CreatePR = styled(Action)`
	top: 10px;
	right: 52px;
	.icon {
		margin-left: 1px;
	}
`;

const Edit = styled(Action)`
	left: 120px;
`;

const Review = styled(Action)`
	left: 200px;
	.adhoc & {
		left: 360px;
	}
`;

const Team = styled(Action)`
	.adhoc & {
		left: 440px;
	}
`;

const Comment = styled(Action)`
	top: -6px;
	left: -6px;
	.adhoc & {
		// top: 102px;
		top: 25px;
		left: 120px;
	}
`;

const Issue = styled(Action)`
	top: auto;
	bottom: 0;
	left: -6px;
	.adhoc & {
		// top: 102px;
		top: 25px;
		bottom: auto;
		left: 200px;
	}
`;

const Amend = styled(Action)`
	top: -6px;
	right: 0;
	left: auto;
	svg {
		padding: 1px 0 0 1px;
	}
`;

const Permalink = styled(Action)`
	left: 280px;
`;

const Fix = styled(Action)`
	top: auto;
	bottom: 0;
	left: auto;
	right: 0;
`;

const Approve = styled(Action)`
	left: 440px;
`;

const DiscussionCircle = styled.div`
	position: absolute;
	top: 60px;
	left: 280px;
	width: 120px;
	height: 120px;
	border: 3px solid #999;
	border-radius: 50%;
	z-index: 2;
`;

const DiscussionAnimate = styled.div`
	position: relative;
	width: 120px;
	height: 120px;
	transition: transform 1s ease-out;
	&.rotate {
		transform: rotate(360deg);
	}
	&.rotate .icon {
		transform: scale(1.5) rotate(-360deg);
	}
	z-index: 2;

	${Comment}, ${Issue}, ${Fix}, ${Amend} {
		z-index: 2;
		.icon {
			display: inline-block;
			transition: transform 1s ease-out;
		}
	}
`;

const Commit = styled.div`
	top: 116px;
	left: 173px;
	position: absolute;
	display: flex;
	height: 15px;
	width: 15px;
	z-index: 4;
	cursor: pointer;
	&:before {
		content: "";
		position: absolute;
		top: 0px;
		left: 0px;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: #999;
	}
	&:after {
		content: "";
		position: absolute;
		top: 3px;
		left: 3px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--base-border-color);
	}
	&.second {
		left: 273px;
	}
	&.third {
		top: 54px;
		left: 333px;
	}
	&.fourth {
		top: 172px;
		left: 333px;
	}
	&.fifth {
		left: 392px;
	}
	transition: transform ease-out 0.2s;
	// transform-origin: 21px 0;

	.active &,
	:hover {
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
		transform: scale(1.5);

		&:after {
			background: #999;
		}
	}
`;

const Key = styled.span`
	font-size: 13px;
	vertical-align: 3px;
	padding-left: 5px;
	white-space: nowrap;
`;

export const VideoLink = styled.a`
	margin-top: 30px;
	display: flex;
	align-items: center;
	> img {
		height: 22px;
		cursor: pointer;
		opacity: 0.8;
		margin-right: 5px;
	}
	> span {
		text-decoration: none !important;
	}
	&:hover > img {
		opacity: 1;
		text-shadow: 0 5px 10px rgba(0, 0, 0, 0.8);
	}
`;

const Desc = styled.div`
	margin: 0 0 20px 0;
`;

const CreateBranch = (
	<Content>
		<h2>Start Work: Grab a Ticket &amp; Create a Branch</h2>
		When you're working on a team, you're going to have a bunch of different features or ideas in
		progress at any given time – some of which are ready to go, and others which are not. Branching
		exists to help you manage this workflow.
		<br />
		<br />
		When you create a branch in your project, you're creating an environment where you can try out
		new ideas. Changes you make on a branch don't affect the main branch, so you're free to
		experiment and commit changes, safe in the knowledge that your branch won't be merged until it's
		been reviewed by someone you're collaborating with.
		<br />
		<br />
		CodeStream makes it easy to get started by integrating with your issue provider, so you can grab
		a ticket without leaving your IDE, and your status is shared automatically with your team.
		<VideoLink href={"https://youtu.be/4MHv8hta02s"}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>Grab a Ticket &amp; Create a Branch</span>
		</VideoLink>
	</Content>
);

const StartWritingCode = (
	<Content>
		<h2>Begin Writing Code</h2>
		Once you've grabbed a ticket, it's time to start making changes. Whenever you add, edit, or
		delete a file, you can share those changes with your teammates to get feedback.
		<br />
		<br />
		When you have questions about existing code, asking is as easy as selecting the code and typing
		your question. CodeStream automatically captures the context of your editor when sharing your
		question with the team, so no context switch is required for you or your teammates. Your
		teammates can participate in this discussion directly in their IDE, or via integrations with
		Slack, MS Teams, or email.
		<VideoLink href={"https://www.youtube.com/watch?v=RPaIIZgaFK8"}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>If I ask comments on my local branch, how do my teammates see them?</span>
		</VideoLink>
	</Content>
);

const RequestFeedback = (
	<Content>
		<h2>Request Feedback from Your Team</h2>
		With one command, request feedback on a snapshot of your repo, including uncommitted &amp;
		unpushed code, allowing you to verify that your work-in-progress is on the right track. (You can
		also do it the old-fashioned way by committing &amp; pushing at the end of your dev sprint, of
		course.)
		<br />
		<br />
		Review teammates’ code in your IDE, with full source tree context, your favorite keybindings,
		jump-to-definition, and the environment you're used to.
		<br />
		<br />
		Comments on reviews are visible in your IDE as source code annotations after merging, creating a
		historical record of discussions and decisions.
		<h3>Exclusive</h3>
		CodeStream makes it easier to get feedback earlier in your dev cycle by disconnecting discussion
		about code with commit flow. This means you can request a review on code you haven't committed
		&amp; pushed yet, and CodeStream will take care of the mechanics of making sure your teammate
		can see your changes by packaging up a diffset along with the review object.
		<VideoLink href={"https://youtu.be/2AyqT4z5Omc"}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>Code Review Walkthrough</span>
		</VideoLink>
	</Content>
);

const DiscussAndRefine = (
	<Content>
		<h2>Discuss and Refine Your Changes</h2>
		Whether your code was a work-in-progress or was ready for final review, chances are pretty good
		your teammates might have some suggestions to make it even better. Whether it's a simple
		thumbs-up, or a tear-it-to-the-ground set of suggestions for a rewrite (hope not!), CodeStream
		makes it easy to both give and receive feedback in real-time, using modern messaging semantics.
		<br />
		<br />
		Unlike other systems, your discussion and commit cadance can be disconnected. This means you can
		share, review, and discuss code without worrying about committing it first.
		<VideoLink href={"FIXME"} style={{ display: "none" }}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>Updating a Code Review to Address Changes</span>
		</VideoLink>
	</Content>
);

const GetFinalApproval = (
	<Content>
		<h2>Get Final Approval</h2>
		CodeStream's code reviews can be reviewed by multiple people, with assignment based on changed
		code, round-robin, or random chance. You can set things up where everyone on the team has to
		give the thumbs-up, or the first person who approves the review wins.
		<br />
		<br />
		However your team works, CodeStream provides the tools to make it easy and transparent, sharing
		every status change with the team through the Acitivty feed, at-mentions, and configurable
		notifications.
		<VideoLink href={"FIXME"} style={{ display: "none" }}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>How are reviewers assigned?</span>
		</VideoLink>
	</Content>
);

// const GetPreliminaryApproval = (
// 	<Content>
// 		<h2>Get Preliminary Approval</h2>
// 		Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
// 		labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
// 		laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
// 		voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
// 		non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
// 		<h3>Exclusive</h3>
// 		<Icon name="checked-checkbox" /> Reviewers are based on a variety of ...
// 		<VideoLink href={"FIXME"}>
// 			<img src="https://i.imgur.com/9IKqpzf.png" />
// 			<span>How are reviewers assigned?</span>
// 		</VideoLink>
// 	</Content>
// );

const CreatePRAndMerge = (
	<Content>
		<h2>Create a PR and Merge</h2>
		Once you get final approval, it's time to publish your changes. CodeStream integrates with your
		PR provider, whether it's GitHub, BitBucket or GitLab, cloud-based or on-prem. Creating a PR is
		a simple two-click process, capturing the context and history of your development workflow, from
		grabbing a ticket, through discussion and review, until final approval.
		<br />
		<br />
		Once the PR is created, final signoff should be a breeze, so code can be merged in on-time and
		stress-free.
		<VideoLink href={"FIXME"} style={{ display: "none" }}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>How do I connect to my code host provider?</span>
		</VideoLink>
	</Content>
);

// const CreatePRAndRequestApproval = (
// 	<Content>
// 		<h2>Create a PR and Request Final Approval</h2>A PR will be created which references the
// 		changes, discussion, and approvals on CodeStream, making the final PR approval a walk in the
// 		park.
// 		<h3>Exclusive</h3>
// 		<Icon name="mark-github" /> CodeStream works with the on-prem and cloud-based versions of
// 		GitHub, GitLab, and BitBucket.
// 		<VideoLink href={"FIXME"}>
// 			<img src="https://i.imgur.com/9IKqpzf.png" />
// 			<span>How do I connect to my source host provider?</span>
// 		</VideoLink>
// 	</Content>
// );

const twitterUrl =
	"https://twitter.com/intent/tweet?ref_src=twsrc%5Etfw&related=twitterapi%2Ctwitter&tw_p=tweetbutton&via=teamcodestream";

const FinalThought = (
	<Content>
		<h2>Final Thought</h2>
		There are many different ways that CodeStream can be used, and it's worth noting that you can
		mix-and-match different strategies if that suits your team. For larger features, go ahead and
		create a branch to contain your changes, but even for one-line fixes, CodeStream makes it easy
		to get a quick second set of eyes on it before you merge directly to master and push.
		<br />
		<br />
		If you've read this far, we'd love to hear your feedback and how CodeStream can help your team
		succeed.
		<br />
		<br />
		<a href="mailto:pez@codestream.com?Subject=CodeStream+Feedback">Email the CEO</a> or{" "}
		<a href={twitterUrl}>Let us know on Twitter</a>
	</Content>
);

const CommitAndPush = (
	<Content>
		<h2>Commit &amp; Push</h2>
		Trunk-based development means there isn't a lot of ceremony between review approval and getting
		code merged in. Once your teammates give you the thumbs-up, you can do any final commits, push
		your code, and move on to the next project. CodeStream updates your status automatically to let
		you know you've finished. Congrats!
	</Content>
);

const GrabATicket = (
	<Content>
		<h2>Start Work: Grab a Ticket</h2>
		If your team uses Jira, Trello, GitHub or a similar service, CodeStream makes it easy to get to
		work by grabbing a ticket that's assigned to you, and sharing your status with the team. When
		you request a code review, it is automatically joined to the ticket so your teammates understand
		the context of your changes. Down the road, you can connect the dots in reverse, going from code
		to commit to review to ticket, to get a better understanding not only of what changed, but also
		why.
		<VideoLink href={"FIXME"} style={{ display: "none" }}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>How do I grab a ticket?</span>
		</VideoLink>
	</Content>
);

const CommentOnCode = (
	<Content>
		<h2>Discuss Any Code, Anytime</h2>
		Discussing code is as simple as "select the code, type your comment", whether it's old code
		you're trying to figure out, new code you've just written, or code that one of your teammates
		just changed.
		<br />
		<br />
		A simple use-cases is when you see code for the first time and don't quite grok it, just select
		it and ask your teammates "how does this work?" CodeStream will at-mention the code authors and
		share your comment on Slack, MS Teams, or via email, to make it easier to get an answer from the
		right person.
		<br />
		<br />
		Your code discussions remain connected to the lines of code being discussed via in-IDE
		annotations, even as you merge in new code or refactor.
		<VideoLink href={"https://youtu.be/RPaIIZgaFK8"}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>Discussing Code with CodeStream</span>
		</VideoLink>
	</Content>
);

const FileAnIssue = (
	<Content>
		<h2>Perform Ad-hoc Code Review</h2>
		Pre-merge code review is a great way to maintain code quality and share information on your
		team. CodeStream also allows you to do a code review post-merge, as you come across code smell
		that you want to ensure gets fixed.
		<br />
		<br />
		CodeStream integrates with nine popular issue tracking services such as Jira and Trello,
		allowing you to create tickets as you come across code that needs to be fixed. It's as simple as
		selecting the code and clicking an icon, and CodeStream takes care of creating the ticket for
		you, and capturing all the context for the assignee.
		<VideoLink href={"https://youtu.be/lUI110T_SHY"}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>Ad-hoc Code Review</span>
		</VideoLink>
	</Content>
);

const GrabAPermalink = (
	<Content>
		<h2>Share Code Anywhere</h2>
		Technical discussion is often spread across different services: project management, team chat,
		documentation wikis and code hosts just to name a few. Until now, if you wanted to share a block
		of code that would still refer to the same location in your codebase over time, you were pretty
		much out of luck.
		<br />
		<br />
		CodeStream's permalinks allow you to select a block of code and share a link to it, and that
		link will stay <b>live</b>, pointing to the right locaion within your codebase, even as your
		code evolves and you merge new code in.
		<VideoLink href={"FIXME"} style={{ display: "none" }}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>How do live permalinks work?</span>
		</VideoLink>
	</Content>
);

const CheckTeamStatus = (
	<Content>
		<h2>Check Your Teammates' Status</h2>
		Live View allows you to (optionally) see your teammates’ local changes at-a-glance, and
		highlights potential merge conflicts pre-commit.
		<br />
		<br />
		As your teammates create new branches, grab tickets, and make progress writing code, everything
		is shared on one team dashboard giving you unprecedented visibility into who is working on what.
		<VideoLink href={"https://youtu.be/h5KI3svlq-0"}>
			<img src="https://i.imgur.com/9IKqpzf.png" />
			<span>CodeStream Live View</span>
		</VideoLink>
	</Content>
);

const FLOW_CONTENT = {
	adhoc: [CommentOnCode, FileAnIssue, GrabAPermalink, RequestFeedback, CheckTeamStatus],
	simplified: [
		GrabATicket,
		StartWritingCode,
		RequestFeedback,
		DiscussAndRefine,
		GetFinalApproval,
		CommitAndPush
	],
	standard: [
		CreateBranch,
		StartWritingCode,
		RequestFeedback,
		DiscussAndRefine,
		GetFinalApproval,
		CreatePRAndMerge,
		FinalThought
	]
	// rigorous: [
	// 	CreateBranch,
	// 	StartWritingCode,
	// 	CommitAndPush,
	// 	RequestFeedback,
	// 	DiscussAndRefine,
	// 	GetPreliminaryApproval,
	// 	CreatePRAndRequestApproval
	// ]
};

export const FlowPanel = () => {
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = React.useState("1");
	return (
		<Dialog wide noPadding onClose={() => dispatch(closePanel())}>
			<PanelHeader title="CodeStream Flow">
				<div style={{ height: "5px" }} />
			</PanelHeader>
			<div style={{ padding: "20px" }}>
				<Tabs style={{ marginTop: 0 }}>
					<Tab onClick={e => setActiveTab(e.target.id)} active={activeTab === "1"} id="1">
						The Basics
					</Tab>
					<Tab onClick={e => setActiveTab(e.target.id)} active={activeTab === "2"} id="2">
						Trunk Flow
					</Tab>
					<Tab onClick={e => setActiveTab(e.target.id)} active={activeTab === "3"} id="3">
						Branch Flow
					</Tab>
				</Tabs>
				{activeTab === "1" && (
					<Content active>
						<Flow flow="adhoc" />
					</Content>
				)}
				{activeTab === "2" && (
					<Content active>
						<Flow flow="simplified" />
					</Content>
				)}
				{activeTab === "3" && (
					<Content active>
						<Flow flow="standard" />
					</Content>
				)}
			</div>
		</Dialog>
	);
};

export const Flow = (props: { flow: "adhoc" | "simplified" | "standard"; active?: number }) => {
	// const [flow, setFlow] = React.useState("standard");
	const [active, setActive] = React.useState(props.active || 0);
	const [rotate, setRotate] = React.useState(false);
	const rootRef = React.useRef(null);
	const rootDimensions = useRect(rootRef, []);
	const scale = Math.min(rootDimensions.width / 600, 1);

	const { flow } = props;

	const clickAction = index => {
		setActive(index);
		if (flow === "simplified" && index === 3) setRotate(!rotate);
		if (flow === "standard" && index === 3) setRotate(!rotate);

		HostApi.instance.track("Flow Step Viewed", {
			"Tour Step":
				flow === "adhoc" ? "The Basics" : flow === "simplified" ? "Trunk Flow" : "Branch Flow",
			"Flow Step Viewed": index
		});

		// if (flow === "rigorous" && index === 4) setRotate(!rotate);
	};

	const setFlow = () => {};
	const clickFlow = e => {
		// setFlow(e.target.id);
		setActive(0);
	};

	const flowDescriptions = {
		adhoc: (
			<Desc>
				Examples of ad-hoc CodeStream use cases that can help in all stages of product development.
			</Desc>
		),
		simplified: (
			<Desc>
				Ultra-lightweight, discussion-driven, trunk-based workflow with frequent code review. Best
				for smaller teams, or teams where work is divided into very small chunks.
			</Desc>
		),
		standard: (
			<Desc>
				Lightweight, discussion-driven, branch-based workflow with frequent code review. Best for
				larger teams, or teams with longer-lived feature branches.
			</Desc>
		),
		rigorous: (
			<Desc>
				Branch-based flow with frequent pushes, frequent code review, and final signoff on GitHub.
			</Desc>
		)
	};

	// 	<p>
	// 	CodeStream Flow is an ultra-lightweight, discussion-based workflow that supports teams and
	// 	projects where code is reviewed and merged regularly. This guide explains how CodeStream can
	// 	make every step of the process easier for you and your team.
	// </p>

	const height = flow === "adhoc" ? 100 : flow === "simplified" ? 150 : 200;

	return (
		<Root ref={rootRef}>
			{flowDescriptions[flow]}
			<div
				style={{
					transform: `scale(${scale})`,
					position: "absolute",
					width: "100%",
					transformOrigin: "top left",
					textAlign: "center",
					marginTop: flow === "simplified" ? `${-50 * scale}px` : 0
				}}
				className={flow}
			>
				<Diagram>
					{flow === "adhoc" && (
						<Contents>
							<Comment className={active === 0 ? "active" : ""} onClick={() => clickAction(0)}>
								<Icon name="comment" />
							</Comment>
							<Issue className={active === 1 ? "active" : ""} onClick={() => clickAction(1)}>
								<Icon name="issue" />
							</Issue>
							<Permalink className={active === 2 ? "active" : ""} onClick={() => clickAction(2)}>
								<Icon name="link" />
							</Permalink>
							<Review className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
								<Icon name="review" />
							</Review>
							<Team className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
								<Icon name="team" />
							</Team>
						</Contents>
					)}

					{flow === "simplified" && (
						<Contents>
							<GitTimeline />
							<GrabTicket className={active === 0 ? "active" : ""} onClick={() => clickAction(0)}>
								<Icon name="ticket" />
							</GrabTicket>
							<Edit className={active === 1 ? "active" : ""} onClick={() => clickAction(1)}>
								<Icon name="pencil" />
							</Edit>
							<Review className={active === 2 ? "active" : ""} onClick={() => clickAction(2)}>
								<Icon name="review" />
							</Review>
							<DiscussionCircle>
								<DiscussionAnimate className={rotate ? "rotate" : ""}>
									<Comment className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="comment" />
									</Comment>
									<Issue className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="issue" />
									</Issue>
									<Amend className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="plus" />
									</Amend>
									<Fix className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="checked-checkbox" />
									</Fix>
								</DiscussionAnimate>
							</DiscussionCircle>
							<Approve className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
								<Icon name="thumbsup" />
							</Approve>
							<Upload className={active === 5 ? "active" : ""} onClick={() => clickAction(5)}>
								<Icon name="upload" />
							</Upload>
						</Contents>
					)}
					{flow === "standard" && (
						<Contents>
							<GitTimeline />
							<BranchLineDown />
							<BranchCurve />
							<BranchLineAcross />
							<GitBranch className={active === 0 ? "active" : ""} onClick={() => clickAction(0)}>
								<Icon name="git-branch" />
							</GitBranch>
							<Edit className={active === 1 ? "active" : ""} onClick={() => clickAction(1)}>
								<Icon name="pencil" />
							</Edit>
							<Review className={active === 2 ? "active" : ""} onClick={() => clickAction(2)}>
								<Icon name="review" />
							</Review>
							<DiscussionCircle>
								<DiscussionAnimate className={rotate ? "rotate" : ""}>
									<Comment className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="comment" />
									</Comment>
									<Issue className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="issue" />
									</Issue>
									<Amend className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="plus" />
									</Amend>
									<Fix className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
										<Icon name="checked-checkbox" />
									</Fix>
								</DiscussionAnimate>
							</DiscussionCircle>
							<Approve className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
								<Icon name="thumbsup" />
							</Approve>
							<CreatePR className={active === 5 ? "active" : ""} onClick={() => clickAction(5)}>
								<Icon name="pull-request" />
							</CreatePR>
							<MergeLineAcross />
							<MergeCurve />
							<MergeLineDown />
						</Contents>
					)}
					{false && (
						<Contents>
							<GitTimeline />
							<BranchLineDown />
							<BranchCurve />
							<BranchLineAcross />
							<GitBranch className={active === 0 ? "active" : ""} onClick={() => clickAction(0)}>
								<Icon name="git-branch" />
							</GitBranch>
							<Edit className={active === 1 ? "active" : ""} onClick={() => clickAction(1)}>
								<Icon name="pencil" />
							</Edit>
							<div className={active === 2 ? "active" : ""} onClick={() => clickAction(2)}>
								<Commit />
								<Commit className="second" />
								<Commit className="third" />
								<Commit className="fourth" />
								<Commit className="fifth" />
							</div>
							<Review className={active === 3 ? "active" : ""} onClick={() => clickAction(3)}>
								<Icon name="review" />
							</Review>
							<DiscussionCircle>
								<DiscussionAnimate className={rotate ? "rotate" : ""}>
									<Comment className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
										<Icon name="comment" />
									</Comment>
									<Issue className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
										<Icon name="issue" />
									</Issue>
									<Amend className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
										<Icon name="plus" />
									</Amend>
									<Fix className={active === 4 ? "active" : ""} onClick={() => clickAction(4)}>
										<Icon name="checked-checkbox" />
									</Fix>
								</DiscussionAnimate>
							</DiscussionCircle>
							<Approve className={active === 5 ? "active" : ""} onClick={() => clickAction(5)}>
								<Icon name="thumbsup" />
							</Approve>
							<CreatePR className={active === 6 ? "active" : ""} onClick={() => clickAction(6)}>
								<Icon name="pull-request" />
							</CreatePR>
							<MergeLineAcross />
							<MergeCurve />
							<MergeLineDown />
						</Contents>
					)}
				</Diagram>
			</div>
			<div style={{ marginTop: `${scale * height}px`, textAlign: "center" }}>
				<Carousel
					active={active}
					lastContent={FLOW_CONTENT[flow].length - 1}
					onChange={value => clickAction(value)}
				>
					{FLOW_CONTENT[flow][active]}
				</Carousel>
			</div>
		</Root>
	);
};
