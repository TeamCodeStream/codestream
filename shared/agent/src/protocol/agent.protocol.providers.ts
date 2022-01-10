"use strict";
import { RequestType } from "vscode-languageserver-protocol";
import { CrossPostIssueValues } from "./agent.protocol";
import { CodeErrorPlus } from "./agent.protocol.codeErrors";
import { CodemarkPlus } from "./agent.protocol.codemarks";
import { ReviewPlus } from "./agent.protocol.reviews";

export interface ThirdPartyProviderConfig {
	id: string;
	name: string; // e.g. "trello"
	host: string;
	apiHost?: string;
	isEnterprise?: boolean;
	forEnterprise?: boolean;
	hasCodeHosting?: boolean;
	hasIssues?: boolean;
	hasSharing?: boolean;
	supportsAuth?: boolean;
	needsConfigure?: boolean;
	needsConfigureForOnPrem?: boolean;
	oauthData?: { [key: string]: any };
	scopes?: string[];
	canFilterByAssignees?: boolean;
}

export interface ThirdPartyDisconnect {
	providerTeamId?: string;
}

export interface ThirdPartyProviders {
	[providerId: string]: ThirdPartyProviderConfig;
}

export interface ConnectThirdPartyProviderRequest {
	providerId: string;
}

export interface ConnectThirdPartyProviderResponse {}

export const ConnectThirdPartyProviderRequestType = new RequestType<
	ConnectThirdPartyProviderRequest,
	ConnectThirdPartyProviderResponse,
	void,
	void
>("codestream/provider/connect");

export interface ConfigureThirdPartyProviderRequest {
	providerId: string;
	data: { [key: string]: any };
}

export interface ConfigureThirdPartyProviderResponse {}

export const ConfigureThirdPartyProviderRequestType = new RequestType<
	ConfigureThirdPartyProviderRequest,
	ConfigureThirdPartyProviderResponse,
	void,
	void
>("codestream/provider/configure");

export interface AddEnterpriseProviderRequest {
	providerId: string;
	host: string;
	data: { [key: string]: any };
}

export interface AddEnterpriseProviderResponse {
	providerId: string;
}

export const AddEnterpriseProviderRequestType = new RequestType<
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderResponse,
	void,
	void
>("codestream/provider/add");

export interface RemoveEnterpriseProviderRequest {
	providerId: string;
}

export const RemoveEnterpriseProviderRequestType = new RequestType<
	RemoveEnterpriseProviderRequest,
	void,
	void,
	void
>("codestream/provider/remove");

export interface DisconnectThirdPartyProviderRequest {
	providerId: string;
	providerTeamId?: string;
}

export interface DisconnectThirdPartyProviderResponse {}

export const DisconnectThirdPartyProviderRequestType = new RequestType<
	DisconnectThirdPartyProviderRequest,
	DisconnectThirdPartyProviderResponse,
	void,
	void
>("codestream/provider/disconnect");

export interface ThirdPartyProviderBoard {
	id: string;
	name: string;
	apiIdentifier?: string;
	assigneesRequired?: boolean;
	assigneesDisabled?: boolean;
	singleAssignee?: boolean;
	[key: string]: any;
}

export interface FetchThirdPartyBoardsRequest {
	providerId: string;
	[key: string]: any;
}

export interface FetchThirdPartyBoardsResponse {
	boards: ThirdPartyProviderBoard[];
}

export const FetchThirdPartyBoardsRequestType = new RequestType<
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	void,
	void
>("codestream/provider/boards");

export interface ThirdPartyProviderCard {
	id: string;
	title: string;
	body: string;
	url: string;
	modifiedAt: number;
	tokenId: string;
	idList?: string;
	apiIdentifier?: string;
	comments?: number;
	[key: string]: any;
}

export interface FetchThirdPartyCardsRequest {
	providerId: string;
	[key: string]: any;
}

export interface FetchThirdPartyCardsResponse {
	cards: ThirdPartyProviderCard[];
	error?: {
		message: string;
	};
}

export const FetchThirdPartyCardsRequestType = new RequestType<
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	void,
	void
>("codestream/provider/cards");

export interface FetchThirdPartyCardWorkflowRequest {
	providerId: string;
	cardId: string;
	[key: string]: any;
}

export interface FetchThirdPartyCardWorkflowResponse {
	workflow: { id: string; name: string }[];
}

export const FetchThirdPartyCardWorkflowRequestType = new RequestType<
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	void,
	void
>("codestream/provider/cards/workflow");

export interface MoveThirdPartyCardRequest {
	providerId: string;
	cardId: string;
	listId: string;
}

export interface MoveThirdPartyCardResponse {
	success: boolean;
}

export const MoveThirdPartyCardRequestType = new RequestType<
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	void,
	void
>("codestream/provider/cards/move");

export interface UpdateThirdPartyStatusRequest {
	providerId: string;
	providerTeamId: string;
	text: string;
	icon?: string;
	expires?: number;
}

export interface UpdateThirdPartyStatusResponse {
	status: any;
}

export const UpdateThirdPartyStatusRequestType = new RequestType<
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusResponse,
	void,
	void
>("codestream/provider/status/update");

export interface CreateThirdPartyPostRequest {
	providerId: string;
	providerTeamId: string;
	channelId: string;
	text: string;
	attributes?: any;
	memberIds?: any;
	codemark?: CodemarkPlus;
	review?: ReviewPlus;
	codeError?: CodeErrorPlus;
	remotes?: string[];
	entryPoint?: string;
	crossPostIssueValues?: CrossPostIssueValues;
	mentionedUserIds?: string[];
	parentPostId?: string;
}
export interface CreateThirdPartyPostResponse {
	post: any;
	ts?: string;
	permalink?: string;
}

export const CreateThirdPartyPostRequestType = new RequestType<
	CreateThirdPartyPostRequest,
	CreateThirdPartyPostResponse,
	void,
	void
>("codestream/provider/posts/create");

export const FetchThirdPartyChannelsRequestType = new RequestType<
	FetchThirdPartyChannelsRequest,
	FetchThirdPartyChannelsResponse,
	void,
	void
>("codestream/provider/channels");

export interface FetchThirdPartyChannelsRequest {
	providerId: string;
	providerTeamId: string;
	[key: string]: any;
}

export interface ThirdPartyChannel {
	id: string;
	name: string;
	type: string;
}

export interface FetchThirdPartyChannelsResponse {
	channels: ThirdPartyChannel[];
}

export interface ThirdPartyProviderUser {
	id?: string;
	displayName: string;
	email?: string;
	avatarUrl?: string;
}

export interface FetchAssignableUsersRequest {
	providerId: string;
	boardId: string;
}

export interface FetchAssignableUsersResponse {
	users: ThirdPartyProviderUser[];
}

export const FetchAssignableUsersRequestType = new RequestType<
	FetchAssignableUsersRequest,
	FetchAssignableUsersResponse,
	void,
	void
>("codestream/provider/cards/users");

export interface CreateThirdPartyCardRequest {
	providerId: string;
	data: {
		[key: string]: any;
	};
}

export interface CreateThirdPartyCardResponse {
	[key: string]: any;
}

export const CreateThirdPartyCardRequestType = new RequestType<
	CreateThirdPartyCardRequest,
	CreateThirdPartyCardResponse,
	void,
	void
>("codestream/provider/cards/create");

interface ThirdPartyProviderSetTokenData {
	host?: string;
	token: string;
	data?: { [key: string]: any };
}

export interface ThirdPartyProviderSetTokenRequestData extends ThirdPartyProviderSetTokenData {
	teamId: string;
}

export interface ThirdPartyProviderSetTokenRequest extends ThirdPartyProviderSetTokenData {
	providerId: string;
}

export interface AddEnterpriseProviderHostRequest {
	provider: string;
	teamId: string;
	host: string;
	data: { [key: string]: any };
}

export interface AddEnterpriseProviderHostResponse {
	providerId: string;
}

export interface RemoveEnterpriseProviderHostRequest {
	provider: string;
	providerId: string;
	teamId: string;
}

export interface ProviderConfigurationData {
	host?: string;
	baseUrl?: string;
	token: string;
	data?: {
		[key: string]: any;
	};
}

export interface FetchThirdPartyPullRequestRequest {
	providerId: string;
	providerTeamId?: string;
	pullRequestId: string;

	/**
	 * in the GitHub world, this is `TeamCodeStream` in https://github.com/TeamCodeStream/codestream
	 */
	owner?: string;
	/**
	 * in the GitHub world, this is `codestream` in https://github.com/TeamCodeStream/codestream
	 */
	repo?: string;
	/**
	 * if true, clear this PR from the cache and re-fetch from the provider
	 */
	force?: boolean;
	metadata?: any;
	/**
	 * for debugging who is calling this
	 */
	src?: string;
}

export interface FetchThirdPartyPullRequestFilesResponse {
	sha: string;
	filename: string;
	previousFilename?: string;
	status: string;
	additions: number;
	changes: number;
	deletions: number;
	patch?: string;
}

export type CheckConclusionState =
	| "ACTION_REQUIRED"
	| "TIMED_OUT"
	| "CANCELLED"
	| "FAILURE"
	| "SUCCESS"
	| "NEUTRAL"
	| "SKIPPED"
	| "STARTUP_FAILURE"
	| "STALE";

export type StatusState = "EXPECTED" | "ERROR" | "FAILURE" | "PENDING" | "SUCCESS" | "NEUTRAL";
export type CheckStatusState = "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "WAITING" | "REQUESTED";

export interface CheckRun {
	__typename: string;
	conclusion: CheckConclusionState;
	status: CheckStatusState;
	name: string;
	title: string;
	detailsUrl: string;
	startedAt: string;
	completedAt: string;
	checkSuite: {
		app: {
			logoUrl: string;
			slug: string;
		};
	};
}

export interface StatusContext {
	__typename: string;
	avatarUrl: string;
	context: string;
	description: string;
	state: StatusState;
	targetUrl: string;
}

export interface FetchThirdPartyPullRequestPullRequest {
	id: string;
	iid?: string;
	providerId: string; // e.g. "github*com"
	// this is the parent repo
	repository: {
		name: string;
		nameWithOwner: string;
		url: string;
	};
	locked: any;
	activeLockReason: "OFF_TOPIC" | "SPAM" | "TOO_HEATED" | "RESOLVED";
	body: string;
	bodyHTML: string;
	baseRefName: string;
	baseRefOid: string;
	forkPointSha?: string;
	author: {
		login: string;
		avatarUrl: string;
	};
	authorAssociation:
		| "COLLABORATOR"
		| "CONTRIBUTOR"
		| "FIRST_TIMER"
		| "FIRST_TIME_CONTRIBUTOR"
		| "MEMBER"
		| "NONE"
		| "OWNER";
	createdAt: string;
	commits: {
		totalCount: number;
		nodes: {
			commit: {
				statusCheckRollup?: {
					state: StatusState;
					contexts: {
						nodes: CheckRun | StatusContext;
					};
				};
			};
		};
	};
	files: {
		totalCount: number;
		nodes: {
			path: string;
			additions: number;
			deletions: number;
		}[];
	};
	headRefName: string;
	headRepositoryOwner?: {
		login: string;
	};
	headRepository?: {
		isFork: boolean;
		name: string;
		url: string;
	};
	headRefOid: string;
	labels: Labels;
	number: number;
	state: string;
	isDraft?: boolean;
	reviewRequests: {
		nodes: {
			requestedReviewer: {
				id: string;
				login: string;
				avatarUrl: string;
			};
		}[];
	};
	reviewThreads: {
		edges: {
			node: {
				id: string;
				isResolved: boolean;
				viewerCanResolve: boolean;
				viewerCanUnresolve: boolean;
				comments: {
					totalCount: number;
					nodes: {
						author: {
							login: string;
							avatarUrl: string;
						};
						id: string;
					}[];
				};
			};
		}[];
	};
	projectCards: {
		nodes: {
			project: {
				id: string;
				name: string;
			};
		}[];
	};
	reviews: {
		nodes: {
			id: string;
			createdAt: string;
			state: string;
			comments: {
				totalCount: number;
			};
			author: {
				id: string;
				login: string;
				avatarUrl: string;
			};
			commit: {
				oid: string;
			};
		}[];
	};
	/**
	 * this is a single pending review for the current user (there can only be 1 at a time for
	 * certain providers, like github)
	 */
	pendingReview?: {
		id: string;
		author: {
			login: string;
			avatarUrl: string;
		};
		comments?: {
			totalCount: number;
		};
	};
	timelineItems: {
		__typename: string;
		totalCount: number;
		pageInfo: {
			startCursor: string;
			endCursor: string;
			hasNextPage: boolean;
		};
		nodes: any[];
	};
	milestone: {
		title: string;
		state: string;
		number: number;
		id: string;
		description: string;
	};
	participants: {
		nodes: {
			avatarUrl: string;
		}[];
	};
	assignees: {
		nodes: {
			avatarUrl: string;
			id: string;
			name: string;
			login: string;
		}[];
	};
	mergeable: string;
	merged: boolean;
	mergedAt: string;
	canBeRebased: string;
	mergeStateStatus: string;
	title: string;
	url: string;
	repoUrl: string;
	baseUrl: string;
	updatedAt: string;
	reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED";
	reactionGroups: any;
	includesCreatedEdit: boolean;
	viewerDidAuthor: boolean;
	viewerCanUpdate: boolean;
	viewerSubscription: string;

	/** this isn't part of the GH object model, but we add it for convenience */
	viewer: {
		id: string;
		login: string;
		avatarUrl: string;
		viewerCanDelete?: boolean;
	};
	supports?: {
		version: {
			version: string;
		};
	};
}

interface BranchProtectionRule {
	requiredApprovingReviewCount: number;
	matchingRefs: {
		nodes: {
			name: string;
		}[];
	};
}

export interface BranchProtectionRules {
	nodes: BranchProtectionRule[];
}

export interface FetchThirdPartyPullRequestRepository {
	id: string;
	url: string;
	resourcePath: string;
	rebaseMergeAllowed: boolean;
	squashMergeAllowed: boolean;
	mergeCommitAllowed: boolean;
	repoOwner: string;
	repoName: string;
	pullRequest: FetchThirdPartyPullRequestPullRequest;
	providerId: string;
	viewerDefaultMergeMethod?: "MERGE" | "REBASE" | "SQUASH";
	viewerPermission: "ADMIN" | "MAINTAIN" | "READ" | "TRIAGE" | "WRITE";
	branchProtectionRules: BranchProtectionRules;
}

interface RateLimit {
	limit: any;
	cost: any;
	remaining: any;
	resetAt: any;
}

export interface FetchThirdPartyPullRequestResponse {
	error?: {
		message: string;
	};
	rateLimit: RateLimit;
	repository: FetchThirdPartyPullRequestRepository;
	viewer: {
		id: string;
		login: string;
		avatarUrl: string;
	};
}

export const FetchThirdPartyPullRequestRequestType = new RequestType<
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	void,
	void
>("codestream/provider/pullrequest");

export interface FetchThirdPartyPullRequestCommitsRequest {
	providerId: string;
	pullRequestId: string;
}

export interface FetchThirdPartyPullRequestCommitsResponse {
	abbreviatedOid: string;
	author: {
		name: string;
		avatarUrl: string;
		user?: {
			login: string;
		};
	};
	committer: {
		avatarUrl: string;
		name: string;
		user?: {
			login: string;
		};
	};
	message: string;
	authoredDate: string;
	oid: string;
	url?: string;
}

export const FetchThirdPartyPullRequestCommitsType = new RequestType<
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse[],
	void,
	void
>("codestream/provider/pullrequestcommits");

export interface ExecuteThirdPartyRequest {
	method: string;
	providerId: string;
	params: any;
}

export interface ExecuteThirdPartyResponse {}

export const ExecuteThirdPartyRequestUntypedType = new RequestType<
	ExecuteThirdPartyRequest,
	ExecuteThirdPartyResponse,
	void,
	void
>("codestream/provider/generic");

export class ExecuteThirdPartyTypedType<Req, Res> extends RequestType<
	ExecuteThirdPartyTypedRequest<Req>,
	Res,
	any,
	any
> {
	constructor() {
		super("codestream/provider/generic");
	}
}

export interface QueryThirdPartyRequest {
	url: string;
}

export interface QueryThirdPartyResponse {
	providerId?: string;
}

export const QueryThirdPartyRequestType = new RequestType<
	QueryThirdPartyRequest,
	QueryThirdPartyResponse,
	void,
	void
>("codestream/provider/query");

export interface FetchProviderDefaultPullRequest {}
export interface FetchProviderDefaultPullResponse {}
export const FetchProviderDefaultPullRequestsType = new RequestType<
	FetchProviderDefaultPullRequest,
	FetchProviderDefaultPullResponse,
	void,
	void
>("codestream/providers/pullrequest/queries");

export interface GetMyPullRequestsRequest {
	owner?: string;
	repo?: string;
	queries: string[];
	/**
	 * forces a re-fetch from the provider
	 */
	force?: boolean;
	/**
	 * is this repo open in the IDE?
	 */
	isOpen?: boolean;
}

export interface Labels {
	nodes: { color: string; description: string; name: string; id: string }[];
}

export interface GetMyPullRequestsResponse {
	id: string;
	providerId: string;
	url: string;
	title: string;
	createdAt: number;
	baseRefName: string;
	headRefName: string;
	headRepository?: {
		name: string;
		nameWithOwner: string;
	};
	author: {
		login: string;
		avatarUrl: string;
	};
	body: string;
	bodyText: string;
	number: number;
	state: string;
	isDraft?: boolean;
	updatedAt: string;
	lastEditedAt: string;
	labels: Labels;
}

export type MergeMethod = "MERGE" | "SQUASH" | "REBASE";

export interface MergePullRequestRequest {
	pullRequestId: string;
	mergeMethod: MergeMethod;
}

export interface CreatePullRequestCommentRequest {
	pullRequestId: string;
	text: string;
}

export interface CreatePullRequestCommentAndCloseRequest {
	pullRequestId: string;
	text: string;
}

export interface ExecuteThirdPartyTypedRequest<T> {
	method: string;
	providerId: string;
	params?: T;
}

export interface ProviderTokenRequest {
	provider: string;
	token: string;
	inviteCode?: string;
	repoInfo?: {
		teamId: string;
		repoId: string;
		commitHash: string;
	};
	noSignup?: boolean;
	signupToken?: string;
	data?: {
		[key: string]: any;
	};
}

export const ProviderTokenRequestType = new RequestType<ProviderTokenRequest, void, void, void>(
	"codestream/provider/token"
);

export interface WebviewErrorRequest {
	error: { message: string; stack: string };
}

export const WebviewErrorRequestType = new RequestType<WebviewErrorRequest, void, void, void>(
	`codestream/webview/error`
);

export interface GetNewRelicErrorGroupRequest {
	errorGroupGuid: string;
	/** allow the lookup of errors without stack traces */
	occurrenceId?: string;
	/** optional, though passing it allows for parallelization */
	entityGuid?: string;
	src?: string;
	timestamp?: number;
}

export interface NewRelicUser {
	email?: string;
	gravatar?: string;
	id?: number;
	name?: string;
}

export interface NewRelicErrorGroup {
	accountId: number;
	entityGuid: string;
	entityType?: string; // ApmApplicationEntity |
	entityName?: string;

	occurrenceId?: string;

	entityUrl?: string;
	errorGroupUrl?: string;

	entityAlertingSeverity?: "CRITICAL" | "NOT_ALERTING" | "NOT_CONFIGURED" | "WARNING";
	/**
	 * This is the "id" aka errorGroupGuid, NR calls this "guid"
	 */
	guid: string;
	title: string;
	message: string;

	states?: string[];
	// TODO these might not be hard-codeable
	state?: "RESOLVED" | "IGNORED" | "UNRESOLVED" | string;

	assignee?: NewRelicUser;

	entity?: {
		repo?: {
			name: string;
			urls: string[];
		};
		relationship?: {
			error?: { message?: string };
		};
	};

	errorTrace?: {
		// exceptionClass: string;
		// agentAttributes: any;
		// intrinsicAttributes: any;
		// message: string;
		path: string;
		stackTrace: {
			filepath?: string;
			line?: number;
			name?: string;
			formatted: string;
		}[];
	};

	hostDisplayName?: string;
	transactionName?: string;

	hasStackTrace?: boolean;

	attributes?: {
		[key: string]: {
			type: "timestamp" | "string" | "number";
			value: string | number | boolean;
		};
	};
}

export interface GetNewRelicErrorGroupResponse {
	errorGroup?: NewRelicErrorGroup;
	accountId: number;
	error?: {
		message: string;
		details?: {
			settings?: { key: string; value: any }[] | undefined;
		};
	};
}

export const GetNewRelicErrorGroupRequestType = new RequestType<
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupResponse,
	void,
	void
>("codestream/newrelic/errorGroup");

export interface GetNewRelicAssigneesRequest {}
export interface GetNewRelicAssigneesResponse {
	users: any[];
}
export const GetNewRelicAssigneesRequestType = new RequestType<
	GetNewRelicAssigneesRequest,
	GetNewRelicAssigneesResponse,
	void,
	void
>("codestream/newrelic/assignees");

export interface NewRelicAccount {
	id: number;
	name: string;
}

export interface GetNewRelicAccountsResponse {
	accounts: NewRelicAccount[];
}
export const GetNewRelicAccountsRequestType = new RequestType<
	void,
	GetNewRelicAccountsResponse,
	void,
	void
>("codestream/newrelic/accounts");

export interface GetObservabilityErrorsRequest {
	filters?: { repoId: string; entityGuid?: string }[];
}

export interface ObservabilityErrorCore {
	entityId: string;
	errorClass: string;
	message: string;
	errorGroupGuid: string;
	errorGroupUrl?: string;
}

export interface ObservabilityError extends ObservabilityErrorCore {
	appName: string;
	remote: string;
	occurrenceId: string;
	count: number;
	lastOccurrence: number;
}

export interface ObservabilityRepoError {
	repoId: string;
	repoName: string;
	errors: ObservabilityError[];
}

export interface ObservabilityRepo {
	repoId: string;
	repoName: string;
	repoRemote: string;
	hasRepoAssociation?: boolean;
	entityAccounts: EntityAccount[];
}

export interface GetObservabilityErrorsResponse {
	repos: ObservabilityRepoError[];
}
export const GetObservabilityErrorsRequestType = new RequestType<
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsResponse,
	void,
	void
>("codestream/newrelic/errors");

export interface GetObservabilityReposRequest {
	filters?: { repoId: string; entityGuid?: string }[];
}

export interface EntityAccount {
	accountId: number;
	accountName: string;
	entityGuid: string;
	entityName: string;
}

export interface GetObservabilityReposResponse {
	repos: ObservabilityRepo[];
}
export const GetObservabilityReposRequestType = new RequestType<
	GetObservabilityReposRequest,
	GetObservabilityReposResponse,
	void,
	void
>("codestream/newrelic/repos");

export interface GetObservabilityEntitiesRequest {
	appName?: string;
	appNames?: string[];
}
export interface GetObservabilityEntitiesResponse {
	entities: { guid: string; name: string }[];
}
export const GetObservabilityEntitiesRequestType = new RequestType<
	GetObservabilityEntitiesRequest,
	GetObservabilityEntitiesResponse,
	void,
	void
>("codestream/newrelic/entities");

export interface GetObservabilityErrorAssignmentsRequest {}
export interface GetObservabilityErrorAssignmentsResponse {
	items: ObservabilityErrorCore[];
}
export const GetObservabilityErrorAssignmentsRequestType = new RequestType<
	GetObservabilityErrorAssignmentsRequest,
	GetObservabilityErrorAssignmentsResponse,
	void,
	void
>("codestream/newrelic/assignments");

export interface GetObservabilityErrorGroupMetadataRequest {
	errorGroupGuid: string;
}
export interface GetObservabilityErrorGroupMetadataResponse {
	occurrenceId?: string;
	entityId?: string;
	remote?: string;
}

export const GetObservabilityErrorGroupMetadataRequestType = new RequestType<
	GetObservabilityErrorGroupMetadataRequest,
	GetObservabilityErrorGroupMetadataResponse,
	void,
	void
>("codestream/newrelic/errorGroup/metadata");

export interface MethodLevelTelemetryRequestOptions {
	includeThroughput?: boolean;
	includeAverageDuration?: boolean;
	includeErrorRate?: boolean;
}

export interface GetMethodLevelTelemetryRequest {
	filePath: string;
	languageId: string;
	codeNamespace?: string;
	functionName?: string;
	newRelicAccountId?: number;
	newRelicEntityGuid?: string;
	options?: MethodLevelTelemetryRequestOptions;
}

export interface GetMethodLevelTelemetryResponse {
	repo: {
		id: string;
		name: string;
	};
	throughput?: { requestsPerMinute: any; functionName: string }[];
	averageDuration?: { averageDuration: any; functionName: string }[];
	errorRate?: { errorsPerMinute: any; functionName: string }[];
	lastUpdateDate?: number;
	hasAnyData?: boolean;
	sinceDateFormatted?: string;
	newRelicAccountId?: number;
	newRelicEntityGuid?: string;
	newRelicEntityName?: string;
	newRelicUrl?: string;
}

export const GetMethodLevelTelemetryRequestType = new RequestType<
	GetMethodLevelTelemetryRequest,
	GetMethodLevelTelemetryResponse,
	void,
	void
>("codestream/newrelic/methodLevelTelemetry");

export interface CrashOrException {
	message?: string;
	stackTrace: StackTrace;
}

export interface EntityCrash extends CrashOrException {}

export interface EntityException extends CrashOrException {}

interface StackTrace {
	frames: { filepath?: string; line?: number; name?: string; formatted: string }[];
}

export interface ErrorGroupStateType {
	type: string;
}

export interface ErrorGroupResponse {
	actor: {
		account: {
			name: string;
		};
		entity: {
			alertSeverity: "CRITICAL" | "NOT_ALERTING" | "NOT_CONFIGURED" | "WARNING" | undefined;
			name: string;
			exception?: EntityException;
			crash?: EntityCrash;
			relatedEntities: {
				results: any[];
			};
		};
		errorsInbox: {
			errorGroupStateTypes?: ErrorGroupStateType[];
			errorGroups: {
				results: ErrorGroup[];
			};
		};
	};
}

export interface StackTraceResponse {
	actor: {
		entity: {
			entityType: string;
			// we will have an exception or a crash
			exception?: EntityException;
			crash?: EntityCrash;
		};
	};
}

export interface Entity {
	account?: {
		name: string;
		id: number;
	};
	guid: string;
	name: string;
	type?: "APPLICATION" | "REPOSITORY";
	tags?: {
		key: string;
		values: string[];
	}[];
}

export interface ErrorGroupsResponse {
	actor: {
		errorsInbox: {
			errorGroups: {
				results: {
					url: string;
					state: string;
					name: string;
					message: string;
					id: string;
					entityGuid: string;
				}[];
			};
		};
	};
}

export interface RelatedEntity {
	source: {
		entity: Entity;
	};
	target: {
		entity: Entity;
	};
	type: "BUILT_FROM";
}

export interface EntitySearchResponse {
	actor: {
		entitySearch: {
			results: {
				entities: Entity[];
			};
		};
	};
}

export interface BuiltFromResult {
	name?: string;
	url?: string;
	error?: {
		message?: string;
	};
}

export interface ErrorGroup {
	id: string;
	state?: string;
	message: string;
	name: string;
	entityGuid: string;
	url: string;
	eventsQuery?: string;
	assignment?: {
		email: string;
		userInfo: {
			gravatar: string;
			id: number;
			name: string;
		};
	};
}

export interface ProviderGetForkedReposResponse {
	parent?: {
		defaultBranchRef?: {
			name: string;
		};
		forks?: any[];
		id?: any;
		name?: string;
		nameWithOwner?: string;
		owner?: string;
		parent?: {
			id?: string;
			name?: string;
			nameWithOwner?: string;
		};
		refs?: {
			nodes?: any[];
		};
		url?: string;
	};
	forks?: {
		defaultBranchRef?: {
			name: string;
		};
		id?: any;
		name?: string;
		nameWithOwner?: string;
		owner?: string;
		refs?: {
			nodes?: any[];
		};
	}[];
	self?: {
		defaultBranchRef?: {
			name: string;
		};
		forks?: any[];
		id?: any;
		name?: string;
		nameWithOwner?: string;
		owner?: string;
		parent?: {
			id?: string;
			name?: string;
			nameWithOwner?: string;
		};
		refs?: {
			nodes?: any[];
		};
		url?: string;
	};
	error?: { message?: string; type: string };
}
