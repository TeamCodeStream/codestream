// Provide the SocketClusterConnection class, which encapsulates communications with SocketCluster to receive
// messages in real-time
"use strict";

import { AGClientSocket, create } from "socketcluster-client";
import { Disposable } from "vscode-languageserver";
import {
	BroadcasterConnection,
	BroadcasterConnectionOptions,
	BroadcasterHistoryInput,
	BroadcasterHistoryOutput,
	BroadcasterStatusType,
	MessageCallback,
	MessageEvent,
	StatusCallback,
} from "./broadcaster";
import { SocketClusterHistory } from "./socketClusterHistory";

// use this interface to initialize the SocketClusterConnection class
export interface SocketClusterInitializer {
	host: string; // host of the socketcluster server
	port: string; // port of the socketcluster server
	ignoreHttps?: boolean; // whether the socketcluster connection uses ssl
	authKey: string; // unique token provided in the login response
	userId: string; // ID of the current user
	strictSSL: boolean; // whether to enforce strict SSL (no self-signed certs)
	debug?(msg: string, info?: any): void; // for debug messages
	onMessage: MessageCallback;
	onStatus: StatusCallback;
}

// internal, maintains map of channels and whether they are yet successfully subscribed
interface SubscriptionMap {
	[key: string]: {
		subscribed: boolean;
	};
}

export class SocketClusterConnection implements BroadcasterConnection {
	private _subscriptions: SubscriptionMap = {};
	private _socket: AGClientSocket | undefined;
	private _logger: (msg: string, info?: any) => void = () => {};
	private _messageCallback: MessageCallback | undefined;
	private _statusCallback: StatusCallback | undefined;
	private _connectionTimer: NodeJS.Timeout | undefined;
	private _connectionPending: boolean = false;
	private _connected: boolean = false;
	private _options: SocketClusterInitializer | undefined;

	// initialize SocketCluster connection
	async initialize(options: SocketClusterInitializer): Promise<Disposable> {
		this._options = options;
		if (options.debug) {
			this._logger = options.debug;
		}
		this._debug("Connection initializing...");

		this._messageCallback = options.onMessage;
		this._statusCallback = options.onStatus;

		this._debug(`Connecting to ${this._options!.host}:${this._options.port}`);
		if (this._options.ignoreHttps) {
			this._debug("Connection will not be secure");
		}
		this._socket = create({
			hostname: this._options!.host,
			port: parseInt(this._options!.port, 10),
			secure: !this._options.ignoreHttps,
			autoReconnect: true,
			wsOptions: { rejectUnauthorized: this._options!.strictSSL },
		});

		await this._confirmConnection();
		return {
			dispose: this.disconnect.bind(this),
		};
	}

	// confirm the connection to the SocketCluster server is good
	async _confirmConnection(): Promise<void> {
		try {
			if (this._connectionTimer) {
				this._debug("Not confirming connection because we already have a connection timer");
				return;
			}
			this._connectionPending = true;
			this._connected = false;
			this._debug("Confirming connection...");
			this._connectionTimer = setTimeout(() => {
				this._debug("Connection timed out");
				this._connectionPending = false;
				delete this._connectionTimer;
				setTimeout(this._confirmConnection.bind(this), 0);
			}, 5000);

			this._debug(
				`Authorizing the connection, host=${this._options!.host} port=${this._options!.port}...`
			);
			try {
				await this._confirmAuth();
			} catch (error) {
				const message = error instanceof Error ? error.message : JSON.stringify(error);
				this._debug(`Unable to authorize connection: ${message}`);
				if (this._connectionTimer) {
					clearTimeout(this._connectionTimer);
					delete this._connectionTimer;
				}
				this._debug("Trying again in 1000 ms...");
				setTimeout(this._confirmConnection.bind(this), 1000);
				return;
			}
			this._debug(`Connection was authorized, socket ${this._socket!.id}`);
			if (this._connectionTimer) {
				clearTimeout(this._connectionTimer);
				delete this._connectionTimer;
			}
			this._connectionPending = false;
			this._connected = true;

			(async () => {
				for await (const { channel } of this._socket!.listener("subscribe")) {
					this._handleSubscribe(channel);
				}
			})();

			(async () => {
				for await (const { error } of this._socket!.listener("error")) {
					this._debug(`SOCKET ERROR, socket ${this._socket!.id}: ${JSON.stringify(error)}`);
					if (this._connectionPending) {
						const message = error instanceof Error ? error.message : JSON.stringify(error);
						this._debug(`Received error during connection: ${message}`);
					} else {
						this.netHiccup();
					}
				}
			})();
		} catch (e) {
			this._debug("Error confirming connection", e);
		}
	}

	disconnect(): void {
		if (this._socket) {
			this._debug(`Disconnecting socket ${this._socket.id}`);
			this.unsubscribeAll();
			this._socket!.killAllListeners();
			this._socket.disconnect();
		}
	}

	reconnect(): void {}

	private netHiccup() {
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.NetworkProblem,
			});
		}
	}

	subscribe(channels: string[], options: BroadcasterConnectionOptions = {}) {
		this._debug("Request to subscribe:", channels);
		const unsubscribedChannels: string[] = [];
		const subscribedChannels: string[] = [];
		for (const channel of channels) {
			const subscription = this._subscriptions[channel] || {
				subscribed: false,
			};
			this._subscriptions[channel] = subscription;
			if (subscription.subscribed) {
				subscribedChannels.push(channel);
			} else {
				unsubscribedChannels.push(channel);
			}
		}
		if (subscribedChannels.length > 0 && this._statusCallback) {
			this._debug("Already subscribed to ", subscribedChannels);
			this._statusCallback({
				status: BroadcasterStatusType.Connected,
				channels: subscribedChannels,
			});
		}
		if (unsubscribedChannels.length > 0) {
			this._debug("Not yet subscribed, will subscribe now to", unsubscribedChannels);
			for (const channel of unsubscribedChannels) {
				this._subscribeToChannel(channel);
			}
		}
	}

	async confirmSubscriptions(channels: string[]): Promise<string[] | boolean> {
		let gotError = false;
		let subscriptions: string[] = [];
		try {
			this._debug("Confirming subscription to: " + JSON.stringify(channels));
			subscriptions = this._socket!.subscriptions();
			if (subscriptions.length === 0) {
				throw new Error("no subscriptions could be confirmed");
			}
		} catch (error) {
			let message = error instanceof Error ? error.message : JSON.stringify(error);
			this._debug("Error confirming subscriptions: " + message);
			try {
				await this._confirmConnection();
			} catch (ex) {
				message = ex instanceof Error ? ex.message : JSON.stringify(ex);
				this._debug("Error confirming connection: " + message);
			}
			gotError = true;
		}
		let troubleChannels: string[] = [];
		if (gotError) {
			troubleChannels = channels;
		} else {
			troubleChannels = channels.filter(channel => !subscriptions.includes(channel));
		}
		return troubleChannels;
	}

	async _confirmAuth() {
		this._debug("Emitting authorization request...");
		try {
			if (!this._socket || !this._options) {
				throw new Error("no socket or options");
			}
			await this._socket!.invoke("auth", {
				token: this._options.authKey,
				uid: this._options.userId,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			throw new Error(`Auth error: ${message}`);
		}
		this._debug("Authorization confirmed");
	}

	fetchHistory(options: BroadcasterHistoryInput): Promise<BroadcasterHistoryOutput> {
		try {
			return new SocketClusterHistory().fetchHistory({
				socket: this._socket!,
				...options,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			this._debug(`Error fetching history (${message}), will confirm good connection`);
			this._confirmConnection();
			throw error;
		}
	}

	_subscribeToChannel(channel: string) {
		if (this._socket!.isSubscribed(channel)) {
			this._debug(`We are already subscribed to ${channel}`);
			this._handleSubscribe(channel);
			return;
		}

		(async () => {
			try {
				for await (const data of this._socket!.subscribe(channel)) {
					this._handleMessage(data, channel);
				}
			} catch (error) {
				this._debug("Failed to subscribe to", channel);
				this._handleSubscribeFail(error, channel);
			}
		})();
	}

	// handle a message coming in on any channel
	_handleMessage(message: any, channel: string) {
		const receivedAt = Date.now();
		if (channel !== "echo") {
			this._debug("Message received at", receivedAt);
		}
		const messageEvent: MessageEvent = {
			receivedAt,
			message,
			channel,
		};
		if (this._messageCallback) {
			this._messageCallback(messageEvent);
		}
	}

	_handleSubscribe(channel: string) {
		this._debug(`Subscription event for channel ${channel}`);
		if (!this._connected) {
			this._debug(`Ignoring subscription event for ${channel}, connection is still pending`);
			// ignore any subscribe events while our connection is not confirmed,
			// not sure why these would happen during reconnect when auth is failing
			return;
		}
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.Connected,
				channels: [channel],
			});
		}
	}

	_handleSubscribeFail(error: any, channel: string) {
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.Failed,
				channels: [channel],
			});
		}
	}

	// unsubscribe to the passed channels
	unsubscribe(channels: string[]) {
		for (const channel in channels) {
			this._unsubscribeChannel(channel);
		}
	}

	_unsubscribeChannel(channel: string) {
		const subscription = this._subscriptions[channel];
		if (subscription) {
			this._socket?.unsubscribe(channel);
		}
		delete this._subscriptions[channel];
	}

	unsubscribeAll() {
		for (const channel in this._subscriptions) {
			this._unsubscribeChannel(channel);
		}
	}

	_debug(msg: string, info?: any) {
		this._logger(`SOCKETCLUSTER: ${msg}`, info);
	}
}
