"use strict";
import { distanceInWordsToNow as _fromNow, format as _format } from "date-fns";
import * as en from "date-fns/locale/en";

const MillisecondsPerMinute = 60000; // 60 * 1000
const MillisecondsPerDay = 86400000; // 24 * 60 * 60 * 1000

/**
adapted from https://github.com/date-fns/date-fns/blob/601bc8e5708cbaebee5389bdaf51c2b4b33b73c4/src/locale/en/build_distance_in_words_locale/index.js

The MIT License (MIT)

Copyright © 2021 Sasha Koss

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
function buildDistanceInWordsLocale() {
	const distanceInWordsLocale: { [key: string]: string | { one: string; other: string } } = {
		lessThanXSeconds: {
			one: "less than a second",
			other: "less than {{count}} seconds"
		},

		xSeconds: {
			one: "1 second",
			other: "{{count}} seconds"
		},

		halfAMinute: "half a minute",

		lessThanXMinutes: {
			one: "a few seconds",
			other: "less than {{count}} minutes"
		},

		xMinutes: {
			one: "a minute",
			other: "{{count}} minutes"
		},

		aboutXHours: {
			one: "an hour",
			other: "{{count}} hours"
		},

		xHours: {
			one: "an hour",
			other: "{{count}} hours"
		},

		xDays: {
			one: "a day",
			other: "{{count}} days"
		},

		aboutXMonths: {
			one: "a month",
			other: "{{count}} months"
		},

		xMonths: {
			one: "a month",
			other: "{{count}} months"
		},

		aboutXYears: {
			one: "a year",
			other: "{{count}} years"
		},

		xYears: {
			one: "a year",
			other: "{{count}} years"
		},

		overXYears: {
			one: "a year",
			other: "{{count}} years"
		},

		almostXYears: {
			one: "a year",
			other: "{{count}} years"
		}
	};

	function localize(token: string, count: number, options: any) {
		options = options || {};

		if (count === 12 && token === "xMonths") {
			token = "aboutXYears";
			count = 1;
		}

		const result = distanceInWordsLocale[token];

		let value: string;
		if (typeof result === "string") {
			value = result;
		} else {
			if (count === 1) {
				value = result.one;
			} else {
				value = result.other.replace("{{count}}", count.toString());
			}
		}

		if (!options.addSuffix) return value;

		if (options.comparison > 0) return `in ${value}`;

		return `${value} ago`;
	}

	return {
		localize: localize
	};
}

// Monkey patch the locale to customize the wording
const patch = en as any;
patch.distanceInWords = buildDistanceInWordsLocale();

const formatterOptions = { addSuffix: true, locale: patch };

/**
adapted from https://github.com/eamodio/vscode-gitlens

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
