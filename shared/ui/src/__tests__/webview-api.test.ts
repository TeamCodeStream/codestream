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
		expect(spyLogError).toHaveBeenLastCalledWith(new Error("21 calls pending for /whatever"));
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
});
