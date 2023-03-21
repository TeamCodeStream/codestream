export class Stopwatch {
	private _start: [number, number] | undefined;
	private _stop: [number, number] | undefined;

	constructor(private readonly _name: string) {

	}

	static createAndStart(name: string): Stopwatch {
		const stopwatch = new Stopwatch(name);
		stopwatch.start();
		return stopwatch;
	}

	start(): void {
		this._start = process.hrtime();
	}

	stop(): void {
		if (!this._start) {
			throw new Error("Stopwatch not started");
		}
		this._stop = process.hrtime(this._start);
	}

	report(): string {
		if (!this._start) {
			throw new Error("Stopwatch not started");
		}

		if (!this._stop) {
			this.stop();
		}

		const [seconds, nanoseconds] = this._stop!;
		const milliseconds = seconds * 1000 + nanoseconds / 1000000;
		return `${this._name}: ${milliseconds.toFixed(2)}ms`;
	}
}
