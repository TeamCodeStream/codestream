"use strict";

export class SessionServiceContainer {
	private readonly _git: any;
	get git() {
		return this._git;
	}

	private readonly _files: any;
	get files(): any {
		return this._files;
	}

	private readonly _codemarks: any;
	get codemarks(): any {
		return this._codemarks;
	}

	private readonly _markerLocations: any;
	get markerLocations(): any {
		return this._markerLocations;
	}

	private readonly _markers: any;
	get markers(): any {
		return this._markers;
	}

	private readonly _posts: any;
	get posts(): any {
		return this._posts;
	}

	private readonly _repos: any;
	get repos(): any {
		return this._repos;
	}

	private readonly _scm: any;
	get scm() {
		return this._scm;
	}

	private readonly _streams: any;
	get streams(): any {
		return this._streams;
	}

	private readonly _teams: any;
	get teams(): any {
		return this._teams;
	}

	private readonly _companies: any;
	get companies(): any {
		return this._companies;
	}

	private readonly _users: any;
	get users(): any {
		return this._users;
	}

	private readonly _documentMarkers: any;
	get documentMarkers() {
		return this._documentMarkers;
	}

	private readonly _providerRegistry: any;
	get providerRegistry() {
		return this._providerRegistry;
	}

	private readonly _repositoryMappings: any;
	get repositoryMappings() {
		return this._repositoryMappings;
	}

	private readonly _ignoreFiles: any;
	get ignoreFiles() {
		return this._ignoreFiles;
	}

	private readonly _textFiles: any;
	get textFiles() {
		return this._textFiles;
	}

	private readonly _reviews: any;
	get reviews() {
		return this._reviews;
	}

	private readonly _codeErrors: any;
	get codeErrors() {
		return this._codeErrors;
	}

	private readonly _nr: any;
	get nr() {
		return this._nr;
	}

	private readonly _pixie: any;
	get pixie() {
		return this._pixie;
	}

	private readonly _repoIdentifier: any;
	get repoIdentifier() {
		return this._repoIdentifier;
	}

	constructor(public readonly session: any) {
		const cinstance = Container.instance();
		this._git = {};
		this._scm = {};
		this._files = {};
		this._markerLocations = {};
		this._codemarks = {};
		this._markers = {};
		this._posts = {};
		this._repos = {};
		this._streams = {};
		this._teams = {};
		this._users = {};
		this._documentMarkers = {};
		this._providerRegistry = {};
		this._repositoryMappings = {};
		this._companies = {};
		this._ignoreFiles = {};
		this._textFiles = {};
		this._reviews = {};
		this._codeErrors = {};
		this._nr = {};
		this._repoIdentifier = {};
		this._pixie = {};
	}
}

class ServiceContainer {
	// TODO: [EA] I think we should try to rework this to avoid the need of the session here
	constructor(public readonly agent: any, private session: any) {
		this._documents = agent.documents;
		this._gitServiceLite = {};
		this._repositoryLocator = {};
		this._unauthenticatedScm = {};
		this._server = {};
		this._errorReporter = {};
		this._telemetry = {};
		this._urls = {};
	}

	private readonly _gitServiceLite: any;
	get gitServiceLite() {
		return this._gitServiceLite;
	}

	private readonly _repositoryLocator: any;
	get repositoryLocator() {
		return this._repositoryLocator;
	}

	private readonly _unauthenticatedScm: any;
	get unauthenticatedScm() {
		return this._unauthenticatedScm;
	}

	private readonly _errorReporter: any;
	get errorReporter() {
		return this._errorReporter;
	}

	private readonly _documents: any;
	get documents() {
		return this._documents;
	}

	private readonly _telemetry: any;
	get telemetry() {
		return this._telemetry;
	}

	private readonly _urls: any;
	get urls() {
		return this._urls;
	}

	private readonly _server: any;
	get server(): any {
		return this._server;
	}
}

let container: ServiceContainer | undefined;

export namespace Container {
	export function initialize(agent: any, session: any) {
		container = new ServiceContainer(agent, session);
	}

	export function instance(): ServiceContainer {
		if (container === undefined) {
			const ex = new Error("Container not yet initialized.");
			throw ex;
		}

		return container;
	}
}

let sessionContainer: SessionServiceContainer | undefined;

export namespace SessionContainer {
	export function initialize(session: any) {
		sessionContainer = new SessionServiceContainer(session);
	}

	export function isInitialized() {
		return sessionContainer ? true : false;
	}

	export function instance(): SessionServiceContainer {
		if (sessionContainer === undefined) {
			debugger;
			const ex = new Error("SessionContainer not yet initialized.");
			throw ex;
		}

		return sessionContainer;
	}
}
