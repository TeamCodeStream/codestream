import { HistoryCounter } from "../../../src/utils/system/historyCounter";

describe("getKeyDatePart", () => {
	it("should return correct time buckets with 5 seconds intervals", async () => {
		const subject = new HistoryCounter(5, 50, console.debug, false);
		const dateKey1 = subject.getKeyDatePart(new Date("2023-01-21T01:00:02"));
		expect(dateKey1).toBe("20230121T010000");
		const dateKey2 = subject.getKeyDatePart(new Date("2023-01-21T01:00:04"));
		expect(dateKey2).toBe("20230121T010000");
		const dateKey3 = subject.getKeyDatePart(new Date("2023-01-21T01:00:05"));
		expect(dateKey3).toBe("20230121T010005");
		const dateKey4 = subject.getKeyDatePart(new Date("2023-01-21T01:00:08"));
		expect(dateKey4).toBe("20230121T010005");
		await subject.dispose();
	});

	it("should return correct time buckets with 15 seconds intervals", async () => {
		const subject = new HistoryCounter(15, 50, console.debug, false);
		const dateKey1 = subject.getKeyDatePart(new Date("2023-01-21T01:00:02"));
		expect(dateKey1).toBe("20230121T010000");
		const dateKey2 = subject.getKeyDatePart(new Date("2023-01-21T01:00:13"));
		expect(dateKey2).toBe("20230121T010000");
		const dateKey3 = subject.getKeyDatePart(new Date("2023-01-21T01:00:16"));
		expect(dateKey3).toBe("20230121T010015");
		const dateKey4 = subject.getKeyDatePart(new Date("2023-01-21T01:00:29"));
		expect(dateKey4).toBe("20230121T010015");
		await subject.dispose();
	});
});
