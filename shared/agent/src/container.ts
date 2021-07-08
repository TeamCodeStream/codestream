"use strict";
import { CodeStreamAgent } from "agent";
import { RepositoryLocator } from "./git/repositoryLocator";
import { DocumentManager } from "./documentManager";
import { ErrorReporter } from "./errorReporter";
import { GitService } from "./git/gitService";
import { Logger } from "./logger";
import { CodemarksManager } from "./managers/codemarksManager";
import { CompaniesManager } from "./managers/companiesManager";
import { DocumentMarkerManager } from "./managers/documentMarkerManager";
import { FilesManager } from "./managers/filesManager";
import { IgnoreFilesManager } from "./managers/ignoreFilesManager";
import { MarkerLocationManager } from "./managers/markerLocationManager";
import { MarkersManager } from "./managers/markersManager";
import { PostsManager } from "./managers/postsManager";
import { RepositoryMappingManager } from "./managers/repositoryMappingManager";
import { ReposManager } from "./managers/reposManager";
import { ReviewsManager } from "./managers/reviewsManager";
import { ScmManager } from "./managers/scmManager";
import { ServerManager } from "./managers/serverManager";
import { StreamsManager } from "./managers/streamsManager";
import { TeamsManager } from "./managers/teamsManager";
import { TelemetryManager } from "./managers/telemetryManager";
import { TextFilesManager } from "./managers/textFilesManager";
import { UnauthenticatedScmManager } from "./managers/unauthenticatedScmManager";
import { UrlManager } from "./managers/urlManager";
import { UsersManager } from "./managers/usersManager";
import { ThirdPartyProviderRegistry } from "./providers/registry";
import { CodeStreamSession } from "./session";
import { GitServiceLite } from "./git/gitServiceLite";

class SessionServiceContainer {
	private readonly _git: GitService;
	get git() {
		return this._git;
	}

	private readonly _files: FilesManager;
	get files(): FilesManager {
		return this._files;
	}

	private readonly _codemarks: CodemarksManager;
	get codemarks(): CodemarksManager {
		return this._codemarks;
	}

	private readonly _markerLocations: MarkerLocationManager;
	get markerLocations(): MarkerLocationManager {
		return this._markerLocations;
	}

	private readonly _markers: MarkersManager;
	get markers(): MarkersManager {
		return this._markers;
	}

	private readonly _posts: PostsManager;
	get posts(): PostsManager {
		return this._posts;
	}

	private readonly _repos: ReposManager;
	get repos(): ReposManager {
		return this._repos;
	}

	private readonly _scm: ScmManager;
	get scm() {
		return this._scm;
	}

	private readonly _streams: StreamsManager;
	get streams(): StreamsManager {
		return this._streams;
	}

	private readonly _teams: TeamsManager;
	get teams(): TeamsManager {
		return this._teams;
	}

	private readonly _companies: CompaniesManager;
	get companies(): CompaniesManager {
		return this._companies;
	}

	private readonly _users: UsersManager;
	get users(): UsersManager {
		return this._users;
	}

	private readonly _documentMarkers: DocumentMarkerManager;
	get documentMarkers() {
		return this._documentMarkers;
	}

	private readonly _providerRegistry: ThirdPartyProviderRegistry;
	get providerRegistry() {
		return this._providerRegistry;
	}

	private readonly _repositoryMappings: RepositoryMappingManager;
	get repositoryMappings() {
		return this._repositoryMappings;
	}

	private readonly _ignoreFiles: IgnoreFilesManager;
	get ignoreFiles() {
		return this._ignoreFiles;
	}

	private readonly _textFiles: TextFilesManager;
	get textFiles() {
		return this._textFiles;
	}

	private readonly _reviews: ReviewsManager;
	get reviews() {
		return this._reviews;
	}

	constructor(public readonly session: CodeStreamSession) {
		const cinstance = Container.instance();
		this._git = new GitService(session, cinstance.repositoryLocator, cinstance.gitServiceLite);
		this._scm = new ScmManager(session);
		this._files = new FilesManager(session);
		this._markerLocations = new MarkerLocationManager(session);
		this._codemarks = new CodemarksManager(session);
		this._markers = new MarkersManager(session);
		this._posts = new PostsManager(session);
		this._repos = new ReposManager(session);
		this._streams = new StreamsManager(session);
		this._teams = new TeamsManager(session);
		this._users = new UsersManager(session);
		this._documentMarkers = new DocumentMarkerManager(session);
		this._providerRegistry = new ThirdPartyProviderRegistry(session);
		this._repositoryMappings = new RepositoryMappingManager(session);
		this._companies = new CompaniesManager(session);
		this._ignoreFiles = new IgnoreFilesManager(session);
		this._textFiles = new TextFilesManager(session);
		this._reviews = new ReviewsManager(session);
	}
}

class ServiceContainer {
	// TODO: [EA] I think we should try to rework this to avoid the need of the session here
	constructor(public readonly agent: CodeStreamAgent, private session: CodeStreamSession) {
		this._documents = agent.documents;
		this._gitServiceLite = new GitServiceLite(session);
		this._repositoryLocator = new RepositoryLocator(session, this._gitServiceLite);
		this._unauthenticatedScm = new UnauthenticatedScmManager();
		this._server = new ServerManager(session);
		this._errorReporter = new ErrorReporter(session);
		this._telemetry = new TelemetryManager(session);
		this._urls = new UrlManager();
	}

	private readonly _gitServiceLite: GitServiceLite;
	get gitServiceLite() {
		return this._gitServiceLite;
	}

	private readonly _repositoryLocator: RepositoryLocator;
	get repositoryLocator() {
		return this._repositoryLocator;
	}

	private readonly _unauthenticatedScm: UnauthenticatedScmManager;
	get unauthenticatedScm() {
		return this._unauthenticatedScm;
	}

	private readonly _errorReporter: ErrorReporter;
	get errorReporter() {
		return this._errorReporter;
	}

	private readonly _documents: DocumentManager;
	get documents() {
		return this._documents;
	}

	private readonly _telemetry: TelemetryManager;
	get telemetry() {
		return this._telemetry;
	}

	private readonly _urls: UrlManager;
	get urls() {
		return this._urls;
	}

	private readonly _server: ServerManager;
	get server(): ServerManager {
		return this._server;
	}
}

let container: ServiceContainer | undefined;

export namespace Container {
	export function initialize(agent: CodeStreamAgent, session: CodeStreamSession) {
		container = new ServiceContainer(agent, session);
	}

	export function instance(): ServiceContainer {
		if (container === undefined) {
			debugger;
			const ex = new Error("Container not yet initialized.");
			Logger.error(ex);
			throw ex;
		}

		return container;
	}
}

let sessionContainer: SessionServiceContainer | undefined;

export namespace SessionContainer {
	export function initialize(session: CodeStreamSession) {
		sessionContainer = new SessionServiceContainer(session);
	}

	export function isInitialized() {
		return sessionContainer ? true : false;
	}

	export function instance(): SessionServiceContainer {
		if (sessionContainer === undefined) {
			debugger;
			const ex = new Error("SessionContainer not yet initialized.");
			Logger.error(ex);
			throw ex;
		}

		return sessionContainer;
	}
}
