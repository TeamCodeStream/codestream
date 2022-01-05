// Retrieves recent history of messages from Pubnub, in case of disconnect or gaps in the session

"use strict";
import * as Pubnub from "pubnub";
import { BroadcasterHistoryOutput, HistoryFetchCallback } from "./broadcaster";

export interface PubnubHistoryInput {
	pubnub: Pubnub;
	channels: string[];
	since: number;
	debug?(msg: string, info?: any): void; // for debug messages
	historyFetchCallback?: HistoryFetchCallback;
}

export class PubnubHistory {
	private _pubnub: Pubnub | undefined;
	private _mostRecentMessage: number = 0;
	private _allMessages: any[] = [];
	private _debug: (msg: string, info?: any) => void = () => {};
	private _historyFetchCallback: HistoryFetchCallback | undefined;

	// Fetch the history of messages that have come through the specified channels since the specified timestamp
	// We do a batch fetch (https://www.pubnub.com/docs/nodejs-javascript/api-reference-storage-and-playback#batch-history)
	// across all channels, though if there are more than 500 channels (will there ever be?), we split that into slices.
	// However, no more than 25 messages will be fetched per channel, so if we see 25 messages for one or more
	// channels, we'll fetch individually from each of those channels using Pubnub's history function
	//
	// To avoid excessive processing of messages, we have two limits: one, if the time since last retrieval is over a
	// week, we return a "Reset" indicator, indicating that rather than trying to fetch history, the client should
	// simply start their session from scratch ... this covers "vacation" and other long-disconnected scenarios ...
	// Note that this constraint is also a function of Pubnub, which is set to save messages only up to a week old
	//
	// The other Reset condition is if we end up with too many messages coming across the wire, current that limit is
	// set to 1000 messages for a channel
	//
	async fetchHistory(options: PubnubHistoryInput): Promise<BroadcasterHistoryOutput> {
		this._pubnub = options.pubnub;
		this._historyFetchCallback = options.historyFetchCallback;
		if (options.debug) {
			this._debug = options.debug;
		}

		const output: BroadcasterHistoryOutput = {};

		// split into slices of 500 channels, which we may never reach, but it's here if we do
		let startSlice = 0;
		let done = false;
		let channels = [];
		const sliceSize = 500; // batch history is limited to 500 channels
		do {
			channels = options.channels.slice(startSlice, sliceSize);
			if (channels.length > 0) {
				if (await this.fetchByChannelSlice(channels, options.since)) {
					this.processMessages();
					startSlice += sliceSize;
				} else {
					output.reset = true;
					done = true;
				}
			}
		} while (!done && channels.length > 0);
		if (!output.reset) {
			output.messages = this._allMessages.map(message => message.message || message.entry);
			output.timestamp = this._mostRecentMessage;
		}
		return output;
	}

	// fetch historical messages for a slice of 500 channels
	private async fetchByChannelSlice(channels: string[], since: number): Promise<boolean> {
		const timetoken = this.timestampToTimetokenStringified(since);
		try {
			await this.retrieveBatchHistory(channels, timetoken);
		} catch (error) {
			// if we reached a "RESET" condition, break out and inform the client, we'll proceed no further
			if (error === "RESET") {
				return false;
			} else {
				throw error;
			}
		}
		return true;
	}

	// process the messages we received ... since the messages are coming from multiple channels, we sort
	// them by timestamp before returning to the client, giving the client a true chronological "replay"
	private processMessages() {
		this._allMessages.forEach(message => {
			message.timestamp = parseInt(message.timetoken, 10);
		});
		this._allMessages.sort((a, b) => {
			return a.timestamp - b.timestamp;
		});

		if (this._allMessages.length > 0) {
			// store the last message received, so we know where to start from next time
			this._mostRecentMessage = this.timetokenToTimeStamp(
				this._allMessages[this._allMessages.length - 1].timestamp
			);
		}
	}

	// retrieve historical messages in batch
	private async retrieveBatchHistory(channels: string[], timetoken: string) {
		this._debug(`Calling Pubnub.fetchMessages from ${timetoken} for ${channels.join(",")}`);
		if (this._historyFetchCallback) {
			this._historyFetchCallback({ channels: channels.join(","), before: "", after: timetoken });
		}
		const response: any = await (this._pubnub! as any).fetchMessages({
			channels,
			end: timetoken,
			count: 25,
			stringifiedTimeToken: true
		});

		// look for any channels that have 25 messages ... for these, we assume there are more
		// messages waiting, and we fetch individually for each channel, where we can get
		// more messages at a time
		const channelsWithMoreMessages: string[] = [];
		const earliestTimetokenPerChannel: { [key: string]: number } = {};
		for (const channel in response.channels) {
			const messages = response.channels[channel];
			this._debug(`channel ${channel} has ${messages.length} messages`);
			this._allMessages.push(...messages);
			if (messages.length === 25) {
				channelsWithMoreMessages.push(channel);
			}
			for (const message of messages) {
				const timetoken = parseInt(message.timetoken, 10);
				if (
					!earliestTimetokenPerChannel[channel] ||
					timetoken < earliestTimetokenPerChannel[channel]
				) {
					earliestTimetokenPerChannel[channel] = timetoken;
				}
			}
		}

		await Promise.all(
			channelsWithMoreMessages.map(async channel => {
				this._debug(`channel ${channel} has more than 25 messages, retrieving earlier history...`);
				await this.retrieveChannelHistory(
					channel,
					earliestTimetokenPerChannel[channel] - 1,
					timetoken
				);
			})
		);
	}

	// retrieve the historical messages for an individual channel ... we can only retrieve in
	// pages of 100 ... but if we get to the limit of 1000 messages (10 pages), we'll stop
	// and force the client to do a session reset instead
	private async retrieveChannelHistory(
		channel: string,
		before: number,
		after: string,
		depth: number = 0
	) {
		if (depth === 10) {
			throw new Error("RESET");
		}
		this._debug(`Calling Pubnub.history from ${after} to ${before} for ${channel}`);
		if (this._historyFetchCallback) {
			this._historyFetchCallback({ channels: channel, before: before.toString(), after });
		}
		const response: any = await (this._pubnub! as any).history({
			channel,
			start: before.toString(),
			end: after,
			stringifiedTimeToken: true
		});
		this._debug(`Pubnub.history returned ${response.messages.length} messages`);
		this._allMessages.push(...response.messages);
		if (response.messages.length >= 100) {
			if (this.timetokenToTimeStamp(response.startTimeToken!) > Date.now()) {
				// https://trello.com/c/djvI9i7L - if customer's clock is wrong, continuing to fetch history
				// could result in too many messages being fetched, or even an infinite loop
				this._debug(
					"Pubnub.history shows timestamps greater than now, presuming client clock is wrong and aborting history fetch"
				);
				return;
			}
			this._debug("Pubnub.history returned 100 or more messages, fetching more...");
			await this.retrieveChannelHistory(
				channel,
				parseInt(response.startTimeToken!, 10),
				after,
				depth + 1
			);
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
}
