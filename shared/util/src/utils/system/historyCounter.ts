import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from "set-interval-async";
import { Disposable } from "vscode-languageserver-protocol";

function padNumber(num: number, padding: number): string {
	return num.toString(10).padStart(padding, "0");
}

export type Logger = (message: string) => void;

type Stats = {
	[key: string]: number;
};

export class HistoryCounter {
	private rateLimitHistogram = new Map<string, number>();
	private readonly interval: SetIntervalAsyncTimer<never>;

	constructor(
		private name: string,
		private bucketSizeSeconds: number,
		private maxLength: number,
		private log: Logger,
		private isDebugging: boolean
	) {
		// Just using setIntervalAsync to deal with setInterval bing completely
		// different type on browser vs node
		this.interval = setIntervalAsync(() => {
			this.trim();
			if (isDebugging) {
				const stats: Stats = {};
				for (const [key, value] of this.rateLimitHistogram.entries()) {
					stats[key] = value;
				}
				log(`${this.name} history ${JSON.stringify(stats, null, 2)}`);
			}
		}, 60000);
	}

	public countAndGet(item: string): number {
		const now = new Date();
		const keyDatePart = this.getKeyDatePart(now);
		const key = `${keyDatePart}|${item}`;
		const count = (this.rateLimitHistogram.get(key) ?? 0) + 1;
		this.rateLimitHistogram.set(key, count);
		return count;
	}

	public reset() {
		this.rateLimitHistogram.clear();
	}

	// Keep size around maxLength records - delete oldest
	private trim() {
		if (this.rateLimitHistogram.size > this.maxLength) {
			const trimCount = this.rateLimitHistogram.size - this.maxLength;
			let deleteCount = 0;
			for (const key of this.rateLimitHistogram.keys()) {
				this.rateLimitHistogram.delete(key);
				if (++deleteCount >= trimCount) {
					break;
				}
			}
		}
	}

	private getTimeBucket(dateTime: Date, seconds: number): Date {
		const dateSeconds = dateTime.getTime() / 1000;
		const rounded = Math.floor(dateSeconds / seconds) * seconds;
		return new Date(rounded * 1000);
	}

	public getKeyDatePart(dateTime: Date): string {
		const timeBucket = this.getTimeBucket(dateTime, this.bucketSizeSeconds);
		return `${timeBucket.getFullYear()}${padNumber(timeBucket.getMonth() + 1, 2)}${padNumber(
			timeBucket.getDate(),
			2
		)}T${padNumber(timeBucket.getHours(), 2)}${padNumber(timeBucket.getMinutes(), 2)}${padNumber(
			timeBucket.getSeconds(),
			2
		)}`;
	}

	async dispose(): Promise<void> {
		if (this.interval) {
			await clearIntervalAsync(this.interval);
		}
	}
}
