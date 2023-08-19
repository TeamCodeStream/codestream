import { fetch, Response } from "undici";
import { Logger } from "../../../src/logger";
import { fetchCore } from "../../../src/system/fetchCore";
import { Functions } from "../../../src/system/function";

jest.mock("undici");
const fetchMock = jest.mocked(fetch);
jest.mock("../../../src/system/function");
const waitMock = jest.mocked(Functions.wait);
jest.mock("../../../src/logger");
const loggerMock = jest.mocked(Logger);

const undiciOriginal = jest.requireActual("undici");

describe("fetchCore", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("should not retry on 200 error", async () => {
		const errorResponse: Partial<Response> = {
			status: 200,
			ok: true,
			text: () => Promise.resolve("good"),
		};
		fetchMock.mockResolvedValueOnce(errorResponse as Response);
		const response = await fetchCore(0, "https://somewhere");
		expect(response[1]).toBe(0);
		const resp = response[0];
		expect(await resp.text()).toBe("good");
		expect(waitMock).toHaveBeenCalledTimes(0);
	});

	it("should retry on 500 error", async () => {
		const errorResponse: Partial<Response> = {
			status: 500,
			ok: false,
		};
		const successResponse: Partial<Response> = {
			status: 200,
			ok: true,
			text: () => Promise.resolve("good"),
		};
		fetchMock
			.mockResolvedValueOnce(errorResponse as Response)
			.mockResolvedValueOnce(successResponse as Response);
		const response = await fetchCore(0, "https://somewhere");
		expect(response[1]).toBe(1);
		const resp = response[0];
		expect(await resp.text()).toBe("good");
		expect(waitMock).toHaveBeenCalledTimes(1);
		expect(waitMock).toHaveBeenCalledWith(250);
	});

	it("should retry on thrown Error", async () => {
		const successResponse: Partial<Response> = {
			status: 200,
			ok: true,
			text: () => Promise.resolve("good"),
		};
		fetchMock
			.mockRejectedValueOnce(new Error("something blewed up"))
			.mockResolvedValueOnce(successResponse as Response);
		const response = await fetchCore(0, "https://somewhere");
		expect(response[1]).toBe(1);
		const resp = response[0];
		expect(await resp.text()).toBe("good");
		expect(waitMock).toHaveBeenCalledTimes(1);
		expect(waitMock).toHaveBeenCalledWith(250);
	});

	it("should give up after 4 500 errors", async () => {
		const errorResponse: Partial<Response> = {
			status: 500,
			ok: false,
		};
		fetchMock.mockResolvedValue(errorResponse as Response);
		const response = await fetchCore(0, "https://somewhere");
		expect(response[1]).toBe(4);
		const resp = response[0];
		expect(resp.status).toBe(500);
		expect(waitMock).toHaveBeenCalledTimes(3);
		expect(waitMock).toHaveBeenLastCalledWith(750);
		expect(loggerMock.error).toHaveBeenCalledTimes(0);
	});

	it("should give up after 4 thrown Errors and throw last error", async () => {
		fetchMock.mockRejectedValue(new Error("something blewed up"));
		await expect(fetchCore(0, "https://somewhere")).rejects.toThrow("something blewed up");
		expect(waitMock).toHaveBeenCalledTimes(3);
		expect(waitMock).toHaveBeenLastCalledWith(750);
		expect(loggerMock.error).toHaveBeenCalledTimes(4);
	});

	it("does not error log boring logs", async () => {
		// Create unmocked ConnectTimeoutError but unfortunately still does not completely fix test
		// (can't use instanceof in fetchCore.ts)
		const cause = new undiciOriginal.errors.ConnectTimeoutError();
		const error = Object.assign(new TypeError("fetch failed"), { cause });
		fetchMock.mockImplementation(() => {
			throw error;
		});
		await expect(fetchCore(0, "https://somewhere")).rejects.toThrow("Connect Timeout Error");
		expect(waitMock).toHaveBeenCalledTimes(3);
		expect(waitMock).toHaveBeenLastCalledWith(750);
		expect(loggerMock.error).toHaveBeenCalledTimes(0);
	});
});
