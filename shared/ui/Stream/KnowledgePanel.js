import createClassString from "classnames";
import { includes as _includes, sortBy as _sortBy } from "lodash-es";
import React, { Component } from "react";
import { connect } from "react-redux";
import { PanelHeader } from "../src/components/PanelHeader";
import * as codemarkSelectors from "../store/codemarks/reducer";
import { setCurrentCodemark, setCurrentStream } from "../store/context/actions";
import * as reviewSelectors from "../store/reviews/reducer";
import * as userSelectors from "../store/users/reducer";
import * as actions from "./actions";
import Codemark from "./Codemark";
import Filter from "./Filter";
import Headshot from "./Headshot";
import Icon from "./Icon";
import ScrollBox from "./ScrollBox";
import Tag from "./Tag";

export class SimpleKnowledgePanel extends Component {
	disposables = [];

	constructor(props) {
		super(props);

		this.state = {
			isLoading: props.codemarks.length === 0,
			openPost: null,
			expanded: {
				inThisFile: true,
				recent: true,
				mine: true,
				open: true,
				closed: true,
				unanswered: true,
			},
			selectedTags: {},
		};

		this.typeLabels = {
			comment: "Code Comments",
			// question: "Questions & Answers",
			issue: "Issues",
			// trap: "Traps"
			// snippet: "Snippets",
			// bookmark: "Bookmarks"
		};
		this.typeLabelsLower = {
			all: "all codemarks",
			comment: "code comments",
			// question: "questions & answers",
			issue: "issues",
			// trap: "traps",
			// snippet: "snippets",
			// bookmark: "bookmarks"
		};
		this.fileFiltersLabelsLower = {
			current: "in current file only",
			unseparated: "from all files, unseparated",
			repo: "in the current repo only",
			all: "from all files",
		};
		this.sectionLabel = {
			inThisFile: "In This File",
			mine: "Open Issues Assigned To Me",
			open: "Open",
			recent: "Recent",
			closed: "Closed",
			unanswered: "Unanswered",
		};
		this.sectionsByType = {
			all: ["mine", "recent"],
			comment: ["mine", "recent"],
			question: ["unanswered", "recent"],
			issue: ["mine", "open", "recent", "closed"],
			trap: ["recent"],
			bookmark: ["recent"],
			// all: ["inThisFile", "mine", "recent"],
			// comment: ["inThisFile", "mine", "recent"],
			// question: ["inThisFile", "unanswered", "recent"],
			// issue: ["inThisFile", "mine", "open", "recent", "closed"],
			// trap: ["inThisFile", "recent"],
			// bookmark: ["inThisFile", "recent"]
		};
		this.sectionsFilterOrder = {
			all: ["mine", "recent"],
			comment: ["mine", "recent"],
			question: ["unanswered", "recent"],
			issue: ["closed", "mine", "open", "recent"],
			trap: ["recent"],
			bookmark: ["recent"],
			// all: ["inThisFile", "mine", "recent"],
			// comment: ["inThisFile", "mine", "recent"],
			// question: ["inThisFile", "unanswered", "recent"],
			// issue: ["closed", "inThisFile", "mine", "open", "recent"],
			// trap: ["inThisFile", "recent"],
			// bookmark: ["inThisFile", "recent"]
		};
	}

	componentDidMount() {
		if (this.props.codemarks.length === 0)
			this.props.fetchCodemarks().then(() => {
				this.setState({ isLoading: false });
			});
		// this.disposables.push(
		// 	EventEmitter.subscribe("interaction:active-editor-changed", this.handleFileChangedEvent)
		// );
		if (this._searchInput) this._searchInput.focus();
	}

	componentWillUnmount() {
		this.disposables.forEach(d => d.dispose());
	}

	handleFileChangedEvent = body => {
		// if (body && body.editor && body.editor.fileName)
		// 	this.setState({ thisFile: body.editor.fileName, thisRepo: body.editor.repoId });
		// else this.setState({ thisFile: null });
	};

	toggleSection = (e, section) => {
		e.stopPropagation();
		this.setState({
			expanded: { ...this.state.expanded, [section]: !this.state.expanded[section] },
		});
	};

	renderPosts = codemarks => {
		const { typeFilter } = this.props;
		if (codemarks.length === 0)
			return <div className="no-matches">No {typeFilter}s in this file.</div>;
		else {
			return codemarks.map(codemark => {
				return (
					<Codemark
						key={codemark.id}
						contextName="Codemarks Tab"
						codemark={codemark}
						displayType="collapsed"
						currentUserName={this.props.currentUserName}
						usernames={this.props.usernames}
						query={this.state.q}
					/>
				);
			});
		}
	};

	renderSection = (section, codemarks) => {
		if (codemarks.length === 0) return null;

		const sectionLabel =
			section === "inThisFile" && this.props.fileNameToFilterFor ? (
				<span>
					In This File: <span className="filename">{this.props.fileNameToFilterFor}</span>
				</span>
			) : (
				this.sectionLabel[section]
			);
		return (
			<div
				className={createClassString("section", "has-children", {
					expanded: this.state.expanded[section],
				})}
			>
				<div className="header" onClick={e => this.toggleSection(e, section)}>
					<Icon name="chevron-right" className="triangle-right" />
					<span className="clickable">{sectionLabel}</span>
				</div>
				<ul>{this.renderPosts(codemarks)}</ul>
			</div>
		);
	};

	codemarkHasTag = (codemark, tagFilter) => {
		if (tagFilter === "all") return true;

		// console.log("Comparing ", tagFilter, "  to  ", this.props.teamTags);
		let tags = codemark.tags || [];
		if (codemark.color && "_" + codemark.color === tagFilter) {
			return true;
		}
		return tags.includes(tagFilter);
	};

	codemarkOnBranch = (codemark, branchFilter) => {
		if (branchFilter === "all") return true;

		return (
			codemark.markers.filter(
				marker =>
					branchFilter === marker.branchWhenCreated || branchFilter === marker.commitHashWhenCreated
			).length > 0
		);
	};

	render() {
		if (this.state.isLoading) return null;

		if (this.props.noCodemarksAtAll) {
			return this.renderBlankFiller();
		}

		const {
			codemarks,
			currentUserId,
			fileNameToFilterFor,
			fileStreamIdToFilterFor,
			fileFilter,
			typeFilter,
			tagFilter,
			authorFilter,
			branchFilter,
			commitArray,
			branchArray,
			authorArray,
		} = this.props;
		const { thisRepo } = this.state;

		const sections = this.sectionsByType[typeFilter];

		let displayCodemarks = {};
		let assignedCodemarks = {};
		let sectionFilters = this.sectionsFilterOrder[typeFilter] || [];
		let totalCodemarks = 0;

		const assignCodemark = (codemark, section) => {
			if (!displayCodemarks[section]) displayCodemarks[section] = [];
			displayCodemarks[section].push(codemark);
			assignedCodemarks[codemark.id] = true;
			totalCodemarks++;
		};

		// sort by most recent first
		_sortBy(codemarks, codemark => -codemark.createdAt).forEach(codemark => {
			const codemarkType = codemark.type || "comment";
			if (codemark.deactivated) return null;
			if (typeFilter !== "all" && codemarkType !== typeFilter) return null;
			if (authorFilter !== "all" && codemark.creatorId !== authorFilter) return null;
			if (!this.codemarkHasTag(codemark, tagFilter)) return null;
			if (!this.codemarkOnBranch(codemark, branchFilter)) return null;

			const codeBlock = codemark.markers && codemark.markers.length && codemark.markers[0];

			const codeBlockRepo = codeBlock && codeBlock.repoId;
			const title = codemark.title;
			const assignees = codemark.assignees;
			const status = codemark.status;
			const q = this.state.q ? this.state.q.toLocaleLowerCase() : null;

			sectionFilters.forEach(section => {
				if (assignedCodemarks[codemark.id]) return;
				// if (!this.state.expanded[section]) return;

				if (
					q &&
					!(codemark.text || "").toLocaleLowerCase().includes(q) &&
					!(title || "").toLocaleLowerCase().includes(q)
				)
					return;
				if (fileFilter === "current" && section !== "inThisFile") return;
				if (fileFilter === "repo" && codeBlockRepo !== thisRepo) return;
				if (fileFilter === "unseparated" && section === "inThisFile") return;
				switch (section) {
					case "inThisFile":
						if (
							fileNameToFilterFor &&
							(codemark.fileStreamIds || []).includes(fileStreamIdToFilterFor)
						)
							assignCodemark(codemark, "inThisFile");
						break;
					case "mine":
						if ((status === "open" || !status) && _includes(assignees || [], currentUserId))
							assignCodemark(codemark, "mine");
						break;
					case "open":
						if (status === "open" || !status) assignCodemark(codemark, "open");
						break;
					case "unanswered":
						if (codemark.numReplies > 0) assignCodemark(codemark, "unanswered");
						break;
					case "recent":
						assignCodemark(codemark, "recent");
						break;
					case "closed":
						if (status === "closed") assignCodemark(codemark, "closed");
						break;
				}
			});
		});

		let typeMenuItems = [
			{ label: "All Codemarks", action: "all" },
			{ label: "-" },
			{ label: "Code Comments", action: "comment" },
			// { label: "Questions & Answers", action: "question" },
			{ label: "Issues", action: "issue" },
			// { label: "Traps", action: "trap" },
			// { label: "Bookmarks", action: "bookmark" }
		];

		// let fileMenuItems = [
		// 	{ label: "From All Files", action: "all" },
		// 	{ label: "From All Files, Unseparated", action: "unseparated" },
		// 	// { label: "In Current Repo Only", action: "repo" },
		// 	{ label: "In Current File Only", action: "current" }
		// ];

		let tagMenuItems = [{ label: "Any Tag", action: "all" }, { label: "-" }];
		tagMenuItems = tagMenuItems.concat(
			this.props.teamTagsArray.map(tag => {
				let className = "tag-menu-block wide";
				if (!tag.color.startsWith("#")) className += " " + tag.color + "-background";
				return {
					label: (
						<span className="tag-menu-selector">
							<span
								className={className}
								style={tag.color.startsWith("#") ? { background: tag.color } : {}}
							>
								{tag.label || <span>&nbsp;</span>}
							</span>
						</span>
					),
					noHover: true,
					searchLabel: tag.label || tag.color,
					action: tag.id,
				};
			})
		);

		let branchMenuItems = [{ label: "Any Branch", action: "all" }, { label: "-" }];
		branchMenuItems = branchMenuItems.concat(
			Object.keys(branchArray)
				.sort()
				.map(branch => {
					return {
						label: (
							<span className="branch-menu-selector">
								<Icon name="git-branch" /> {branch}
							</span>
						),
						searchLabel: branch,
						action: branch,
					};
				}),
			{ label: "-" },
			Object.keys(commitArray)
				.sort((a, b) => commitArray[a] - commitArray[b])
				.map(commit => {
					return {
						label: (
							<span className="branch-menu-selector">
								<Icon name="git-commit" /> {commit.substr(0, 8)}
							</span>
						),
						searchLabel: commit,
						action: commit,
					};
				})
		);

		let authorMenuItems = [{ label: "Anyone", action: "all" }, { label: "-" }];
		authorMenuItems = authorMenuItems.concat(
			Object.values(authorArray)
				// .sort((a, b) => a.fullName )
				.map(author => {
					return {
						label: (
							<span className="branch-menu-selector">
								<Headshot size={18} person={author} />
								{author.name}
							</span>
						),
						searchLabel: author.name,
						action: author.codestreamId || author.id,
					};
				})
		);

		// console.log("SELECTED AG FILTER: ", tagFilter);
		return (
			<div className="panel full-height knowledge-panel">
				<PanelHeader title="Search">
					<div className="search-bar">
						<input
							name="q"
							className="input-text control"
							type="text"
							ref={ref => (this._searchInput = ref)}
							onChange={e => this.setState({ q: e.target.value })}
							placeholder="Search Codemarks"
						/>
					</div>

					<div className="filters">
						Show{" "}
						<Filter
							onValue={this.props.setCodemarkTypeFilter}
							selected={typeFilter}
							labels={this.typeLabelsLower}
							items={typeMenuItems}
						/>
						<Filter
							onValue={this.props.setCodemarkAuthorFilter}
							selected={authorFilter}
							labels={this.props.authorFiltersLabelsLower}
							items={authorMenuItems}
						/>
						<Filter
							onValue={this.props.setCodemarkTagFilter}
							selected={tagFilter}
							labels={this.props.tagFiltersLabelsLower}
							items={tagMenuItems}
						/>
						<Filter
							onValue={this.props.setCodemarkBranchFilter}
							selected={branchFilter}
							labels={this.props.branchFiltersLabelsLower}
							items={branchMenuItems}
						/>
					</div>
				</PanelHeader>
				<ScrollBox>
					<div className="channel-list vscroll">
						{totalCodemarks > 0 &&
							sections.map(section => {
								return this.renderSection(section, displayCodemarks[section] || []);
							})}
						{!totalCodemarks && <div className="no-matches">No codemarks match this type.</div>}
					</div>
				</ScrollBox>
			</div>
		);
	}

	renderBlankFiller() {
		return (
			<div className="panel codemarks-panel">
				<div className="getting-started">
					<div>
						<p>
							Codemarks are the building blocks of your team’s knowledge base.{" "}
							<a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/discuss-code/">
								Learn more about how to use codemarks.
							</a>
						</p>
					</div>
					<div className="info">
						<div className="codemark-info" onClick={this.onClickCodemarkTypeFor("comment")}>
							<Icon name="comment" className="type-icon" />
							<div className="text">
								<h3>Comment</h3>
								<p>Link any type of comment or question to a block of code.</p>
							</div>
						</div>
						<div className="codemark-info" onClick={this.onClickCodemarkTypeFor("issue")}>
							<Icon name="issue" className="type-icon" />
							<div className="text">
								<h3>Issue</h3>
								<p>See some code that needs to be fixed or refactored? Assign an issue.</p>
							</div>
						</div>
						{
							// <div className="codemark-info" onClick={this.onClickCodemarkTypeFor("trap")}>
							// 	<Icon name="trap" className="type-icon" />
							// 	<div className="text">
							// 		<h3>Code Trap</h3>
							// 		<p>
							// 			Create a trap around code that shouldn’t be touched without talking to you first.
							// 		</p>
							// 	</div>
							// </div>
						}
						{
							// 	<div className="codemark-info" onClick={this.onClickCodemarkTypeFor("bookmark")}>
							// 	<Icon name="bookmark" className="type-icon" />
							// 	<div className="text">
							// 		<h3>Bookmark</h3>
							// 		<p>Bookmark parts of the code you want to be able to get back to quickly.</p>
							// 	</div>
							// </div>
						}
						<div className="codemark-info" onClick={this.onClickCodemarkTypeFor("link")}>
							<Icon name="link" className="type-icon" />
							<div className="text">
								<h3>Permalink</h3>
								<p>Get a shareable link to a block of code.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	onClickCodemarkTypeFor = type => e => {
		e.preventDefault();
		this.props.setMultiCompose(true, {
			codemarkType: type,
		});
	};

	toggleStatus = id => {
		this.setState({
			statusPosts: { ...this.state.statusPosts, [id]: !this.state.statusPosts[id] },
		});
	};

	handleClickCreateKnowledge = e => {
		e.stopPropagation();
		this.props.setActivePanel("main");
		setTimeout(() => {
			this.props.runSlashCommand("multi-compose");
		}, 500);
		return;
	};

	handleClickSelectItem = event => {
		event.preventDefault();
		var liDiv = event.target.closest("li");
		if (!liDiv) return; // FIXME throw error
		if (liDiv.id) {
			this.props.setActivePanel("main");
			this.props.setCurrentStream(liDiv.id);
		} else if (liDiv.getAttribute("teammate")) {
			this.props.createStream({ type: "direct", memberIds: [liDiv.getAttribute("teammate")] });
		} else {
			console.log("Unknown LI in handleClickSelectStream: ", event);
		}
	};
}

const mapStateToProps = state => {
	const { context, teams, users } = state;

	let fileNameToFilterFor;
	let fileStreamIdToFilterFor;
	if (context.activeFile && context.fileStreamId) {
		fileNameToFilterFor = context.activeFile;
		fileStreamIdToFilterFor = context.fileStreamId;
	} else if (context.activeFile && !context.fileStreamId) {
		fileNameToFilterFor = context.activeFile;
	} else {
		fileNameToFilterFor = context.lastActiveFile;
		fileStreamIdToFilterFor = context.lastFileStreamId;
	}

	const codemarks = codemarkSelectors.getTypeFilteredCodemarks(state);
	const reviews = reviewSelectors.getByStatus(state);
	const usernames = userSelectors.getUsernames(state);
	const usernameMap = userSelectors.getUsernamesById(state);

	const teamTagsArray = userSelectors.getTeamTagsArray(state);
	let tagFiltersLabelsLower = { all: "with any tag" };
	teamTagsArray.map(tag => {
		// tagFiltersLabelsLower[tag.id] = "with tag: " + (tag.label || tag.color);
		tagFiltersLabelsLower[tag.id] = (
			<span>
				with tag <Tag tag={tag}></Tag>
			</span>
		);
	});

	let branchFiltersLabelsLower = { all: "on any branch" };
	let authorFiltersLabelsLower = { all: "by anyone" };
	let branchArray = {};
	let commitArray = {};
	let authorArray = {};
	codemarks.forEach(codemark => {
		const { markers, createdAt, creatorId } = codemark;
		const author = userSelectors.getUserByCsId(users, creatorId);
		if (author) {
			author.name = author.fullName || author.username || author.email;
			authorArray[creatorId] = author;
			authorFiltersLabelsLower[creatorId] = (
				<span className="headshot-wrapper">
					by &nbsp;
					<Headshot size={18} person={author} />
					{author.name}
				</span>
			);
		}
		markers.forEach(marker => {
			const { branchWhenCreated: branch, commitHashWhenCreated: commit } = marker;
			if (branch) {
				// keep track of the most recent comment on the branch
				branchArray[branch] = Math.max(createdAt, branchArray[branch]);
				branchFiltersLabelsLower[branch] = (
					<span>
						on &nbsp;
						<Icon name="git-branch" />
						&nbsp;{branch}
					</span>
				);
			}
			if (commit) {
				// keep track of the most recent comment on the commit
				commitArray[commit] = Math.max(createdAt, commitArray[commit]);
				branchFiltersLabelsLower[commit] = (
					<span>
						on &nbsp;
						<Icon name="git-commit" />
						&nbsp;{commit.substr(0, 8)}
					</span>
				);
			}
		});
	});

	return {
		noCodemarksAtAll: !codemarkSelectors.teamHasCodemarks(state),
		usernames,
		codemarks,
		reviews,
		team: teams[context.currentTeamId],
		fileFilter: context.codemarkFileFilter,
		typeFilter: context.codemarkTypeFilter,
		tagFilter: context.codemarkTagFilter,
		authorFilter: context.codemarkAuthorFilter,
		branchFilter: context.codemarkBranchFilter,
		fileNameToFilterFor,
		fileStreamIdToFilterFor,
		teamTagsArray,
		tagFiltersLabelsLower,
		branchArray,
		commitArray,
		authorArray,
		branchFiltersLabelsLower,
		authorFiltersLabelsLower,
		webviewFocused: context.hasFocus,
	};
};

export default connect(mapStateToProps, { ...actions, setCurrentStream, setCurrentCodemark })(
	SimpleKnowledgePanel
);
