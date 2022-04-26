"use strict";
import { distanceInWordsToNow as _fromNow, format as _format } from "date-fns";
import * as en from "date-fns/locale/en";

const MillisecondsPerMinute = 60000; // 60 * 1000
const MillisecondsPerDay = 86400000; // 24 * 60 * 60 * 1000

const formatterOptions = { addSuffix: true, locale: en };

/**
Portions adapted from hhttps://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/system/date.ts which carries this notice:
The MIT License (MIT)
Copyright (c) 2016-2021 Eric Amodio
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
Copyright (c) 2018-2021 CodeStream Inc.
 */
export namespace Dates {
	export interface IDateFormatter {
		fromNow(): string;
		format(format: string): string;
	}

	export function dateDaysFromNow(date: Date, now: number = Date.now()) {
		const startOfDayLeft = startOfDay(now);
		const startOfDayRight = startOfDay(date);

		const timestampLeft =
			startOfDayLeft.getTime() - startOfDayLeft.getTimezoneOffset() * MillisecondsPerMinute;
		const timestampRight =
			startOfDayRight.getTime() - startOfDayRight.getTimezoneOffset() * MillisecondsPerMinute;

		return Math.round((timestampLeft - timestampRight) / MillisecondsPerDay);
	}

	export function startOfDay(date: Date | number) {
		const newDate = new Date(typeof date === "number" ? date : date.getTime());
		newDate.setHours(0, 0, 0, 0);
		return newDate;
	}

	export function toFormatter(date: Date): IDateFormatter {
		return {
			fromNow: () => _fromNow(date, formatterOptions),
			format: (format: string) => _format(date, format)
		};
	}
}
