// Provide the PubnubConnection class, which encapsulates communications with Pubnub to receive
// messages in real-time
"use strict";
import { Agent as HttpsAgent } from "https";
import HttpsProxyAgent from "https-proxy-agent";
import Pubnub from "pubnub";
import { inspect } from "util";
import { Disposable } from "vscode-languageserver";
// import { PubnubHistory, PubnubHistoryInput, PubnubHistoryOutput } from "./pubnubHistory";
import {
	BroadcasterConnection,
	BroadcasterConnectionOptions,
	BroadcasterHistoryInput,
	BroadcasterHistoryOutput,
	BroadcasterStatusType,
	MessageCallback,
	MessageEvent,
	StatusCallback,
	HistoryFetchCallback
} from "./broadcaster";
import { PubnubHistory } from "./pubnubHistory";

interface PubnubMessage {
	timetoken: string;
	message: any;
}

interface PubnubBatchHistoryResponse {
	channels: {
		[channel: string]: PubnubMessage[];
	};
}

interface PubnubHistoryResponse {
	messages: PubnubMessage[];
}

const PING_INTERVAL = 30000;

// use this interface to initialize the PubnubConnection class
export interface PubnubInitializer {
	subscribeKey: string; // identifies our Pubnub account, comes from pubnubKey returned with the login response from the API
	authKey: string; // unique Pubnub token provided in the login response
	userId: string; // ID of the current user
	debug?(msg: string, info?: any): void; // for debug messages
	httpsAgent?: HttpsAgent | HttpsProxyAgent;
	onMessage: MessageCallback;
	onStatus: StatusCallback;
	onFetchHistory?: HistoryFetchCallback;
}

// internal, maintains map of channels and whether they are yet successfully subscribed
interface SubscriptionMap {
	[key: string]: {
		subscribed: boolean;
	};
}

export class PubnubConnection implements BroadcasterConnection {
	private _userId: string | undefined;
	private _pubnub: Pubnub | undefined;
	private _listener: Pubnub.ListenerParameters | undefined;
	private _statusTimeout: NodeJS.Timer | undefined;
	private _logger: (msg: string, info?: any) => void = () => {};
	private _messageCallback: MessageCallback | undefined;
	private _statusCallback: StatusCallback | undefined;
	private _historyFetchCallback: HistoryFetchCallback | undefined;
	private _subscriptionMap: SubscriptionMap = {};

	// initialize PubnubConnection and optionally subscribe to channels
	async initialize(options: PubnubInitializer): Promise<Disposable> {
		if (options.debug) {
			this._logger = options.debug;
		}
		this._debug(`Connection initializing...`);

		this._userId = options.userId;
		this._pubnub = new Pubnub({
			authKey: options.authKey,
			uuid: options.userId,
			subscribeKey: options.subscribeKey,
			restore: true,
			logVerbosity: false,
			// heartbeatInterval: 30,
			autoNetworkDetection: true,
			proxy: options.httpsAgent instanceof HttpsProxyAgent && options.httpsAgent.proxy
		} as Pubnub.PubnubConfig);

		this._messageCallback = options.onMessage;
		this._statusCallback = options.onStatus;
		this._historyFetchCallback = options.onFetchHistory;
		this.addListener();
		this.startPinging();

		return {
			dispose: () => {
				this.disconnect();
				this._pubnub!.stop();
			}
		};
	}

	// subscribe to the passed channels
	subscribe(channels: string[], options: BroadcasterConnectionOptions = {}) {
		const unsubscribedChannels: string[] = [];
		const subscribedChannels: string[] = [];
		for (const channel of channels) {
			const subscription = this._subscriptionMap[channel] || {
				subscribed: false
			};
			if (subscription.subscribed) {
				subscribedChannels.push(channel);
			} else {
				unsubscribedChannels.push(channel);
			}
		}
		if (subscribedChannels.length > 0) {
			this.onStatus({
				status: BroadcasterStatusType.Connected,
				channels: subscribedChannels
			});
		}
		if (unsubscribedChannels.length > 0) {
			this._debug(`Subscribing to ${JSON.stringify(unsubscribedChannels)}`);
			this._pubnub!.subscribe({
				channels: unsubscribedChannels
			});
		}
	}

	// unsubscribe to the passed channels
	unsubscribe(channels: string[]) {
		this._pubnub!.unsubscribe({ channels });
	}

	// add listeners for Pubnub status updates and messages
	private addListener() {
		this._listener = {
			message: this.onMessage.bind(this),
			status: this.onStatus.bind(this)
		} as Pubnub.ListenerParameters;
		this._pubnub!.addListener(this._listener);
	}

	// remove Pubnub listeners we set up earlier
	private removeListener() {
		if (this._pubnub && this._listener) {
			this._pubnub.removeListener(this._listener);
		}
	}

	// ping the PubNub server at regular intervals
	// this replaces the need for their built-in heartbeat and is a free transaction, so costs us nothing
	private startPinging() {
		setInterval(() => {
			(this._pubnub as any).time((status: { error: string }, response: { timetoken: string }) => {
				if (status.error) {
					this._debug(
						`Server ping returned status error: ${status.error}, assuming network hiccup`
					);
					this.netHiccup();
				}
			});
		}, PING_INTERVAL);
	}

	// when a message is received from Pubnub...
	private onMessage(event: Pubnub.MessageEvent) {
		const receivedAt = this.timetokenToTimeStamp(event.timetoken);
		this._debug(`Message received on ${event.channel} at ${receivedAt}`);
		const messageEvent: MessageEvent = {
			receivedAt,
			message: event.message,
			channel: event.channel
		};
		if (this._messageCallback) {
			this._messageCallback(messageEvent);
		}
	}

	// respond to a Pubnub status event
	private onStatus(status: Pubnub.StatusEvent | any) {
		this._debug(
			`Pubnub status received (category=${status.category} operation=${status.operation})`
		);
		this._debug(`Subscribed channels: ${status.subscribedChannels}`);
		if ((status as any).error && status.operation === Pubnub.OPERATIONS.PNUnsubscribeOperation) {
			// ignore any errors associated with unsubscribing
			return;
		} else if (
			!(status as any).error &&
			status.operation === Pubnub.OPERATIONS.PNSubscribeOperation &&
			status.category === Pubnub.CATEGORIES.PNConnectedCategory
		) {
			this.setConnected(status.subscribedChannels);
		} else if (
			(status as any).error &&
			status.category === Pubnub.CATEGORIES.PNAccessDeniedCategory
		) {
			// an access denied message, in direct response to a subscription attempt
			const channels = status.errorData.payload.channels;
			this._debug(`Access denied for channels: ${channels}`);
			const criticalChannels: string[] = [];
			const nonCriticalChannels: string[] = [];
			// HACK: whether a channel is critical should be passed as an option and processed through the
			// chain, but the changes to the code are too complicated ... this all needs a refactor anyway
			status.errorData?.payload?.channels.forEach((channel: string) => {
				if (channel.startsWith("object-")) {
					nonCriticalChannels.push(channel);
				} else {
					criticalChannels.push(channel);
				}
			});

			if (criticalChannels.length > 0) {
				this._debug(`Access denied for critical channels: ${criticalChannels}`);
				this.subscriptionFailure(criticalChannels);
			}
			if (nonCriticalChannels.length > 0) {
				this.unsubscribe(nonCriticalChannels);
				if (this._statusCallback) {
					this._statusCallback!({
						status: BroadcasterStatusType.NonCriticalFailure,
						channels: nonCriticalChannels
					});
				}
			}
		} else if (
			(status as any).error &&
			(status.operation === Pubnub.OPERATIONS.PNHeartbeatOperation ||
				status.operation === Pubnub.OPERATIONS.PNSubscribeOperation)
		) {
			// a network error of some kind, make sure we are truly connected
			this._debug(`PubNub network error: ${inspect(status)}`);
			this.netHiccup();
		}
	}

	// set the given channels as successfully subscribed to, and if we're subscribed to
	// all channels that have been requested, catch up on any missed history and emit
	// a Connected event when done
	private setConnected(channels: string[]) {
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.Connected,
				channels
			});
		}
	}

	private reset() {
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.Reset
			});
		}
	}

	async confirmSubscriptions(channels: string[], optimistic = false): Promise<string[] | boolean> {
		// under the pessimistic scenario, we assume we are being called because of some network failure,
		// and that all channels should be resubscribed to
		return optimistic;
	}

	fetchHistory(options: BroadcasterHistoryInput): Promise<BroadcasterHistoryOutput> {
		return new PubnubHistory().fetchHistory({
			pubnub: this._pubnub!,
			historyFetchCallback: this._historyFetchCallback,
			...options
		});
	}

	private async netHiccup() {
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.NetworkProblem
			});
		}
	}

	disconnect() {
		this.removeListener();
		if (this._statusTimeout) {
			clearTimeout(this._statusTimeout!);
		}
	}

	reconnect() {
		(this._pubnub! as any).reconnect();
	}

	private async subscriptionFailure(channels: string[]) {
		if (this._statusCallback) {
			this._statusCallback({
				status: BroadcasterStatusType.Failed,
				channels
			});
		}
	}

	// convert from unix timestamp to stringified Pubnub time token
	private timestampToTimetokenStringified(timestamp: number): string {
		return (timestamp * 10000).toString();
	}

	// convert from Pubnub time token to unix timestamp
	private timetokenToTimeStamp(timetoken: string): number {
		return Math.floor(parseInt(timetoken, 10) / 10000);
	}

	_debug(msg: string, info?: any) {
		this._logger(`PUBNUB: ${msg}`, info);
	}
}
