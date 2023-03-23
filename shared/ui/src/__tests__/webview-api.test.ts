/* eslint-disable @typescript-eslint/no-empty-function */
import { nextId, RequestApiManager } from "../../webview-api";
import { expect, jest, describe, afterEach, it } from "@jest/globals";
import * as Logger from "../../logger";

describe("RequestApiManager", () => {
	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it("should detect stale requests over 5 minutes", () => {
		const subject = new RequestApiManager(false);
		jest.useFakeTimers().setSystemTime(new Date("2023-02-01T08:00:00"));
		const id = nextId();
		subject.set(id, {
			method: "/whatever",
			reject: _reason => {},
			resolve: _value => {},
		});
		jest.useFakeTimers().setSystemTime(new Date("2023-02-01T08:05:01"));
		const stales = subject.collectStaleRequests();
		expect(stales.length).toBe(1);
	});

	it("should not detect stale requests at or under 5 minutes", () => {
		const subject = new RequestApiManager(false);
		jest.useFakeTimers().setSystemTime(new Date("2023-02-01T08:00:00"));
		const id = nextId();
		subject.set(id, {
			method: "/whatever",
			reject: _reason => {},
			resolve: _value => {},
		});
		jest.useFakeTimers().setSystemTime(new Date("2023-02-01T08:05:00"));
		const stales = subject.collectStaleRequests();
		expect(stales.length).toBe(0);
	});

	it("should alert when requests to same method > ALERT_THRESHOLD", () => {
		const subject = new RequestApiManager(false);
		const spyLogError = jest.spyOn(Logger, "logError").mockImplementation(() => {});
		for (let i = 0; i < 21; i++) {
			const id = nextId();
			subject.set(id, {
				method: "/whatever",
				reject: _reason => {},
				resolve: _value => {},
			});
		}
		expect(spyLogError).toHaveBeenCalledTimes(1);
		expect(spyLogError).toHaveBeenLastCalledWith(
			new Error("More than 20 calls pending for /whatever")
		);
	});

	it("should round down to nearest exponent of 10 same method > ALERT_THRESHOLD", () => {
		const subject = new RequestApiManager(false);
		const spyLogError = jest.spyOn(Logger, "logError").mockImplementation(() => {});
		for (let i = 0; i < 1999; i++) {
			const id = nextId();
			subject.set(id, {
				method: "/whatever",
				reject: _reason => {},
				resolve: _value => {},
			});
		}
		expect(spyLogError.mock.calls.length).toBeGreaterThan(1970);
		expect(spyLogError).toHaveBeenLastCalledWith(
			new Error("More than 1000 calls pending for /whatever")
		);
	});

	it("should not alert when requests are for logError message", () => {
		const subject = new RequestApiManager(false);
		const spyLogError = jest.spyOn(Logger, "logError").mockImplementation(() => {});
		for (let i = 0; i < 21; i++) {
			const id = nextId();
			subject.set(id, {
				method: "codestream/reporting/message",
				reject: _reason => {},
				resolve: _value => {},
			});
		}
		expect(spyLogError).toHaveBeenCalledTimes(0);
	});

	it("should not alert when requests to same method < ALERT_THRESHOLD", () => {
		const subject = new RequestApiManager(false);
		const spyLogError = jest.spyOn(Logger, "logError").mockImplementation(() => {});
		for (let i = 0; i < 20; i++) {
			const id = nextId();
			subject.set(id, {
				method: "/whatever",
				reject: _reason => {},
				resolve: _value => {},
			});
		}
		expect(spyLogError).toHaveBeenCalledTimes(0);
	});

	it("should collect stale requests", () => {
		const subject = new RequestApiManager(false);
		jest.spyOn(Logger, "logError").mockImplementation(() => {});
		const theNow = 1679529102000;
		const someTimeAgo = theNow - 10 * 60 * 1000;
		jest.spyOn(Date, "now").mockImplementation(() => someTimeAgo);
		for (let i = 0; i < 5; i++) {
			const id = nextId();
			subject.set(id, {
				method: "/whatever",
				reject: _reason => {},
				resolve: _value => {},
			});
		}
		for (let i = 0; i < 2; i++) {
			const id = nextId();
			subject.set(id, {
				method: "/whenever",
				reject: _reason => {},
				resolve: _value => {},
			});
		}

		jest.spyOn(Date, "now").mockImplementation(() => theNow);
		const staleRequests = subject.collectStaleRequests();
		// expect(spyDateNow).toHaveBeenCalledTimes(6);
		expect(staleRequests.sort()).toStrictEqual(
			[
				"Found 2 stale requests for /whenever with oldest at 2023-03-22T23:41:42.000Z",
				"Found 5 stale requests for /whatever with oldest at 2023-03-22T23:41:42.000Z",
			].sort()
		);
	});
});
