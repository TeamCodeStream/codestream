"use strict";

import { ParsedDiff } from "diff";
import { RepoScmStatus, ThirdPartyProviders } from "./agent.protocol";
import { CSReviewCheckpoint } from "./api.protocol";

export interface CSEntity {
	deactivated?: boolean;
	createdAt: number;
	modifiedAt: number;
	id: string;
	creatorId: string;
	version?: number;
}

export enum ProviderType {
	MSTeams = "msteams",
	Slack = "slack",
	CodeStream = "codestream"
}

export enum CodemarkType {
	Comment = "comment",
	Issue = "issue",
	Bookmark = "bookmark",
	Question = "question",
	Trap = "trap",
	Link = "link",
	Review = "review",
	Reaction = "reaction"
}

export enum CodemarkStatus {
	Open = "open",
	Closed = "closed"
}

export interface CSCodemark extends CSEntity {
	teamId: string;
	streamId: string;
	postId: string;
	parentPostId?: string;
	markerIds?: string[];
	fileStreamIds: string[];
	providerType?: ProviderType;
	type: CodemarkType;
	permalink: string;
	// color is no longer used; now we use tags
	color?: "blue" | "green" | "yellow" | "orange" | "red" | "purple" | "aqua" | "gray" | string;
	tags?: string[];
	isChangeRequest?: boolean;

	// IDs of codemarks that are somehow related to this one.
	// this should be symmetrical, implying that the related codemark
	// also has this codemark's ID in its relatedCodemarkIds array
	relatedCodemarkIds?: string[];

	status: CodemarkStatus;
	title: string;
	assignees: string[];
	text: string;
	numReplies: number;

	// whether this codemark should appear in spatial view. defaults to true (archived if false)
	pinned: boolean;
	// which replies should be promoted to the top-level spatial view (represted in the UI as "starred")
	pinnedReplies?: string[];

	externalAssignees?: { displayName: string; email?: string }[];
	externalProvider?: string;
	externalProviderHost?: string;
	externalProviderUrl?: string;

	lastActivityAt: number;
	lastReplyAt: number;

	// array of people following this codemark
	followerIds?: string[];

	// review this codemark is in reply to
	reviewId?: string;
}

export interface CSMarkerIdentifier {
	id: string;
	file: string;
	repoId: string;
}

export interface CSMarker extends CSEntity, CSMarkerIdentifier {
	teamId: string;
	fileStreamId: string;
	postStreamId: string;
	postId: string;
	codemarkId: string;
	providerType?: ProviderType;
	commitHashWhenCreated: string;
	branchWhenCreated?: string;
	locationWhenCreated: CSLocationArray;
	code: string;
	referenceLocations: CSReferenceLocation[];
	supersededByMarkerId: string;
	remoteCodeUrl?: { displayName: string; name: string; url: string };
}

export interface CSLocationMeta {
	createdAtCurrentCommit?: boolean;
	startWasDeleted?: boolean;
	endWasDeleted?: boolean;
	entirelyDeleted?: boolean;
	contentChanged?: boolean;
	isAncestor?: boolean;
	isDescendant?: boolean;
	canonicalCommitDoesNotExist?: boolean;
}

export type CSLocationArray = [number, number, number, number, CSLocationMeta | undefined];

export interface CSReferenceLocation {
	commitHash?: string;
	location: CSLocationArray;
	flags?: {
		canonical?: boolean;
		uncommitted?: boolean;
		backtracked?: boolean;
		unversionedFile?: boolean;
		baseCommit?: string;
		diff?: ParsedDiff;
	};
}

export interface CSMarkerLocations {
	teamId: string;
	streamId: string;
	commitHash: string;
	locations: { [id: string]: CSLocationArray };
}

export interface CSMarkerLocation {
	id: string;
	lineStart: number;
	colStart: number;
	lineEnd: number;
	colEnd: number;
	meta?: CSLocationMeta;
}

export interface CSCodeBlock {
	code: string;
	markerId: string;
	file: string;
	repoId: string;
	streamId?: string;
}

// FIXME -- what other statuses do we need?
export enum ReviewStatus {
	Open = "open",
	Closed = "closed"
}

export enum FileStatus {
	untracked = "?",
	added = "A",
	renamed = "R",
	deleted = "D",
	copied = "C",
	unmerged = "U",
	modified = "M"
}

export interface ReviewChangesetFileInfo {
	oldFile: string;
	file: string;
	linesAdded: number;
	linesRemoved: number;
	status: FileStatus;
	statusX?: FileStatus;
	statusY?: FileStatus;
	reviewStatus?: { [reviewerId: string]: "visited" | "current" };
}

export interface CSReviewDiffs {
	leftBaseAuthor: string;
	leftBaseSha: string;
	leftDiffs: ParsedDiff[];
	rightBaseAuthor: string;
	rightBaseSha: string;
	rightDiffs: ParsedDiff[];
	rightReverseDiffs: ParsedDiff[];
	latestCommitSha: string;
	rightToLatestCommitDiffs: ParsedDiff[];
	latestCommitToRightDiffs: ParsedDiff[];
}

export interface CSReviewChangesetBase {
	repoId: string;
	branch: string;
	commits: { sha: string; info: {}; localOnly: boolean }[];
	modifiedFiles: ReviewChangesetFileInfo[];
	modifiedFilesInCheckpoint: ReviewChangesetFileInfo[];
	includeSaved: boolean;
	includeStaged: boolean;
	diffId: string;
	checkpoint: CSReviewCheckpoint;
}

export interface CSReviewChangeset extends CSEntity, CSReviewChangesetBase {}

export function isCSReview(object: any): object is CSReview {
	const maybeReview: Partial<CSReview> = object;
	return maybeReview.reviewers != null && maybeReview.reviewChangesets != null;
}

export interface CSReviewApprovals {
	[userId: string]: { approvedAt: number };
}

// pending isn't used (yet?) so commenting it out
export type CSReviewStatus = "approved" | "open" | "rejected"; // | "pending";

export interface CSReview extends CSEntity {
	title: string;
	text: string;
	reviewers: string[];

	// in the case where there are multiple reviewers, if this is
	// true, then all of the reviewers must approve the review.
	// defaults to false
	allReviewersMustApprove?: boolean;
	// an array of people who have approved the review
	approvedBy?: CSReviewApprovals;

	// authorsById is whose code is impacted by this set of changes across
	// all of the changesets. stomped is the # of lines of the author's
	// code that have been changed, and commits is the # of commits in the
	// review by that author, other than the person requesting the review
	authorsById?: { [authorId: string]: { stomped: number; commits: number } };
	teamId: string;
	streamId: string;
	postId: string;
	fileStreamIds: string[];
	status: CSReviewStatus;
	numReplies: number;
	tags?: string[];
	reviewChangesets: CSReviewChangeset[];
	lastActivityAt: number;
	followerIds?: string[];
	// TODO eventually make this not optional
	permalink?: string;
	approvedAt?: number;
	pullRequestUrl?: string;
	pullRequestTitle?: string;
	pullRequestProviderId?: string;
}

export interface CSPost extends CSEntity {
	teamId: string;
	streamId: string;
	parentPostId?: string;
	numReplies: number;
	text: string;
	seqNum: number | string;
	hasBeenEdited: boolean;
	mentionedUserIds?: string[];
	origin?: "email" | "slack" | "msteams";
	reactions?: { [key: string]: string[] };
	codemarkId?: string;
	reviewCheckpoint?: number;
	reviewId?: string;
	files?: [
		{
			mimetype: string;
			name: string;
			title: string;
			type: string;
			url: string;
			preview?:
				| string
				| {
						url: string;
						width: number;
						height: number;
				  };
		}
	];
}

export interface CSRemote {
	url: string;
	normalizedUrl: string;
	companyIdentifier: string;
}

export interface CSRepository extends CSEntity {
	name: string;
	remotes: CSRemote[];
	teamId: string;
}

export enum StreamType {
	Channel = "channel",
	Direct = "direct",
	File = "file"
}

export enum ChannelServiceType {
	Vsls = "vsls"
}

export interface CSChannelStream extends CSEntity {
	isArchived: boolean;
	privacy: "public" | "private";
	sortId: string;
	teamId: string;
	mostRecentPostCreatedAt?: number;
	mostRecentPostId?: string;
	purpose?: string;

	type: StreamType.Channel;
	name: string;
	memberIds?: string[];
	isTeamStream: boolean;
	serviceType?: ChannelServiceType.Vsls;
	serviceKey?: string;
	serviceInfo?: { [key: string]: any };

	priority?: number;
}

export interface CSDirectStream extends CSEntity {
	isArchived: boolean;
	isClosed?: boolean;
	privacy: "public" | "private";
	sortId: string;
	teamId: string;
	mostRecentPostCreatedAt?: number;
	mostRecentPostId?: string;
	purpose?: string;

	type: StreamType.Direct;
	name?: string;
	memberIds: string[];

	priority?: number;
}

export interface CSFileStream extends CSEntity {
	isArchived: boolean;
	privacy: "public" | "private";
	sortId: string;
	teamId: string;
	mostRecentPostCreatedAt?: number;
	mostRecentPostId?: string;
	purpose?: string;

	type: StreamType.File;
	file: string;
	repoId: string;
	numMarkers: number;
	editingUsers?: any;
}

export type CSStream = CSChannelStream | CSDirectStream | CSFileStream;

export interface CSTeamMSTeamsProviderInfo {
	teamId?: string;
	tenantId?: string;
}

export interface CSTeamSlackProviderInfo {
	teamId: string;
}

export type CSTeamProviderInfos = CSTeamMSTeamsProviderInfo | CSTeamSlackProviderInfo;

export interface CSCompany extends CSEntity {
	name: string;
	trialStartDate?: number;
	trialEndDate?: number;
	plan?: string;
	reportingGroup?: string;
}

export interface CSTeam extends CSEntity {
	companyId: string;
	memberIds: string[];
	removedMemberIds?: string[];
	adminIds?: string[];
	name: string;
	primaryReferral: "internal" | "external";
	integrations?: { [key: string]: { enabled: boolean } };
	providerInfo?: {
		msteams?: CSTeamMSTeamsProviderInfo;
		slack?: CSTeamSlackProviderInfo;
	};
	providerHosts?: ThirdPartyProviders;
	plan?: string;
	trialStartDate?: number;
	trialEndDate?: number;
	companyMemberCount?: number;
	// array of tags for a given team. note that there is
	// a default set that can be modified for the entire team
	tags?: {
		[id: string]: CSTag;
	};
	// only used for analytics and reporting. differentiates between teams created by us employees
	reportingGroup?: string;

	settings?: {
		[setting: string]: any;
	};
}

export interface CSTag {
	id?: string;
	color: string;
	label?: string;
	deactivated?: boolean;
	sortOrder?: number;
}

export interface CSAsanaProviderInfo {
	refreshToken: string;
	accessToken: string;
	expiresAt: number;
	userId: string;
	hosts: { [host: string]: CSAsanaProviderInfo };
}

export interface CSBitbucketProviderInfo {
	refreshToken: string;
	accessToken: string;
	expiresAt: number;
	userId: string;
	hosts: { [host: string]: CSBitbucketProviderInfo };
	data?: {
		baseUrl?: string;
		scopes?: string;
	};
}

export interface CSGitHubProviderInfo {
	accessToken: string;
	userId: string;
	hosts: { [host: string]: CSGitHubProviderInfo };
	data?: {
		baseUrl?: string;
	};
}

export interface CSGitLabProviderInfo {
	accessToken: string;
	userId: string;
	hosts: { [host: string]: CSGitLabProviderInfo };
	data?: {
		baseUrl?: string;
	};
}

export interface CSJiraProviderInfo {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	hosts: { [hosts: string]: CSJiraProviderInfo };
}

export interface CSMSTeamsProviderInfo {
	accessToken: string;
	data: {
		expires_in: number;
		scope: string;
		token_type: string;
	};
	expiresAt: number;
	refreshToken: string;

	teamId: string;
	userId: string;
	hosts?: { [host: string]: CSMSTeamsProviderInfo };
	extra?: { [host: string]: any };
	multiple?: {
		[teamId: string]: Omit<CSMSTeamsProviderInfo, "multiple">;
	};
}

export interface CSJiraServerProviderInfo {
	accessToken: string;
	oauthTokenSecret: string;
	hosts: { [hosts: string]: CSJiraServerProviderInfo };
}

export interface CSSlackProviderInfo {
	accessToken: string;
	teamId: string;
	userId: string;
	hosts?: { [host: string]: CSSlackProviderInfo };
	data?: { [key: string]: any };
	extra?: { [host: string]: any };
	multiple?: {
		[teamId: string]: Omit<CSSlackProviderInfo, "multiple">;
	};
}

export interface MSTeamsProviderInfo {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	teamId: string;
	userId: string;
	hosts?: { [host: string]: MSTeamsProviderInfo };
	data?: { [key: string]: any };
	extra?: { [key: string]: any };
	multiple?: {
		[teamId: string]: Omit<MSTeamsProviderInfo, "multiple">;
	};
}

export interface CSTrelloProviderInfo {
	accessToken: string;
	apiKey: string;
	userId: string;
	hosts: { [host: string]: CSTrelloProviderInfo };
}

export interface CSYouTrackProviderInfo {
	accessToken: string;
	userId: string;
	hosts: { [host: string]: CSYouTrackProviderInfo };
	data?: {
		baseUrl?: string;
	};
}

export interface CSAzureDevOpsProviderInfo {
	accessToken: string;
	organization?: string;
	hosts: { [host: string]: CSAzureDevOpsProviderInfo };
}

export interface CSOktaProviderInfo {
	accessToken: string;
	hosts: { [host: string]: CSAzureDevOpsProviderInfo };
}

export type CSProviderInfos =
	| CSAsanaProviderInfo
	| CSBitbucketProviderInfo
	| CSGitHubProviderInfo
	| CSGitLabProviderInfo
	| CSJiraProviderInfo
	| CSMSTeamsProviderInfo
	| CSJiraServerProviderInfo
	| CSSlackProviderInfo
	| CSTrelloProviderInfo
	| CSYouTrackProviderInfo
	| CSAzureDevOpsProviderInfo
	| CSOktaProviderInfo;

type Filter<T, U> = T extends U ? T : never;
export type CSRefreshableProviderInfos = Filter<CSProviderInfos, { refreshToken: string }>;

export interface CSUser extends CSEntity {
	companyIds: string[];
	email: string;
	firstName: string;
	fullName: string;
	isRegistered: boolean;
	lastLogin?: number;
	phoneNumber?: string;
	iWorkOn?: string;
	lastName: string;
	lastPostCreatedAt: number;
	numMentions: number;
	numInvites: number;
	registeredAt: number;
	secondaryEmails?: string[];
	teamIds: string[];
	timeZone: string;
	totalPosts: number;
	totalReviews: number;
	numUsersInvited: number;
	username: string;
	providerIdentities?: string[];
	codestreamId?: string;
	externalUserId?: string;
	// all of the local changes on disk (i.e. not pushed)
	modifiedRepos?: { [teamId: string]: RepoScmStatus[] };
	modifiedReposModifiedAt?: number;
	status?: CSMeStatus;

	avatar?: {
		image?: string;
		image48?: string;
	};
	dnd?: boolean;
	presence?: string;
	preferences?: CSMePreferences;
	firstSessionStartedAt?: number;
}

export interface CSLastReads {
	[streamId: string]: number | string;
}

export enum CSNotificationPreference {
	All = "all",
	InvolveMe = "involveMe",
	Off = "off"
}

export enum CSNotificationDeliveryPreference {
	All = "all",
	EmailOnly = "emailOnly",
	ToastOnly = "toastOnly",
	Off = "off"
}

export enum CSReviewApprovalSetting {
	User = "user",
	Anyone = "anyone",
	All = "all"
}

export enum CSReviewAssignmentSetting {
	None = "none",
	Authorship1 = "authorship1",
	Authorship2 = "authorship2",
	Authorship3 = "authorship3",
	RoundRobin = "roundRobin",
	Random = "random"
}

export interface PullRequestQuery {
	providerId: string;
	name: string;
	query: string;
	hidden: boolean;
}

export interface CSMePreferences {
	telemetryConsent?: boolean; // legacy
	telemetryOptOut?: boolean;
	notifications?: CSNotificationPreference;
	notificationDelivery?: CSNotificationDeliveryPreference;
	skipWallToWallBanner?: boolean;
	skipGitEmailCheck?: boolean;
	skipEmailingAuthors?: boolean;
	skipPostCreationModal?: boolean;
	pullRequestFilesChangedMode?: "files" | "hunks";
	pullRequestQueries?: PullRequestQuery[];
	pullRequestQueryShowAllRepos?: boolean;
	pullRequestQueryHideLabels?: boolean;
	hiddenPaneNodes?: {
		[nodeId: string]: boolean;
	};
	[key: string]: any;
}

export interface CSMeStatus {
	label: string;
	ticketId: string;
	ticketUrl: string;
	ticketProvider: string; // "trello" | "jira" ....
	invisible?: boolean;
}

type CSMeProviderInfo = { slack?: CSSlackProviderInfo } & {
	[teamId in string]: {
		asana?: CSAsanaProviderInfo;
		github?: CSGitHubProviderInfo;
		jira?: CSJiraProviderInfo;
		jiraserver?: CSJiraServerProviderInfo;
		msteams?: CSMSTeamsProviderInfo;
		slack?: CSSlackProviderInfo;
		trello?: CSTrelloProviderInfo;
		youtrack?: CSYouTrackProviderInfo;
		azuredevops?: CSAzureDevOpsProviderInfo;
		okta?: CSOktaProviderInfo;
		[key: string]: CSProviderInfos | undefined;
	};
};

export interface CSMe extends CSUser {
	lastReads: CSLastReads;
	joinMethod: string;
	lastInviteType?: string;
	preferences?: CSMePreferences;
	providerInfo?: CSMeProviderInfo;
	mustSetPassword?: boolean;
	inMaintenanceMode?: boolean;
}

export interface CSApiCapability {
	description?: string;
	url?: string;
	version?: string;
	restricted?: boolean;
	supportedIdes?: string[];
}

export interface CSApiCapabilities {
	[id: string]: CSApiCapability;
}

export interface CSApiFeatures {
	slack?: { interactiveComponentsEnabled?: boolean };
}
